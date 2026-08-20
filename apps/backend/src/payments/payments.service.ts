// ========== Imports: ==========
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import { createHash } from "crypto";
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentDocument, PaymentStatus } from './schemas/payment.schema';
import { EventsService } from "../events/events.service";
import { RsvpService } from "../rsvp/rsvp.service";
import { PayfastNotifyDto, PayfastNotifyResultDto } from "./dto/payfast-notify.dto";
import { InitiatePaymentResponseDto } from "./dto/initiate-payment-response.dto";

interface PayfastNotifyFields {
    [key: string]: string;
    m_payment_id: string;
    pf_payment_id: string;
    payment_status: string;
    item_name: string;
    amount_gross: string;
}

@Injectable()
export class PaymentsService {
    constructor (
        @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
        private readonly configService: ConfigService,
        private readonly eventsService: EventsService,
        private readonly rsvpService: RsvpService,
    ) {}

    async initiate(eventId: string, userId: string): Promise<InitiatePaymentResponseDto> {
        const event = await this.eventsService.findById(eventId);

        if (!event.sellsTickets || event.ticketPrice === null) {
            throw new BadRequestException('Hierdie geleentheid verkoop nie kaartjies nie');
        }
        if (event.ticketsAvailable === null || event.ticketsAvailable <= 0) {
            throw new ConflictException('Geen kaartjies meer beskikbaar nie');
        }

        const alreadyHasTicket = await this.rsvpService.hasTicket(eventId, userId);
        if (alreadyHasTicket) {
            throw new ConflictException("Jy het reeds 'n kaartjie vir hierdie geleentheid");
        }

        const reference = uuidv4();
        const amount = event.ticketPrice;

        const payment = await new this.paymentModel({
            event: event._id,
            user: userId,
            reference, 
            amount,
            status: PaymentStatus.HANGENDE,
        }).save();

        const merchantId = this.configService.get<string>('payfast.merchantId')!;
        const merchantKey = this.configService.get<string>('payfast.merchantKey')!;
        const passphrase = this.configService.get<string>('payfast.passphrase')!;
        const notifyUrl = this.configService.get<string>('payfast.notifyUrl')!;
        const returnUrl = this.configService.get<string>('payfast.returnUrl')!;
        const cancelUrl = this.configService.get<string>('payfast.cancelUrl')!;
        const mode = this.configService.get<string>('payfast.mode');

        const itemName = event.title.slice(0, 100);
        const amountStr = amount.toFixed(2);

        const checkoutFields = {
            merchant_id: merchantId,
            merchant_key: merchantKey,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            notify_url: notifyUrl,
            m_payment_id: reference,
            amount: amountStr,
            item_name: itemName,
        };
        const checkoutSignature = this.buildSignature(checkoutFields, passphrase);

        const simulation = mode === 'simulate'
        ? {
            success: this.buildSimulatedNotify(reference, payment._id.toString(), 'COMPLETE', itemName, amountStr, passphrase),
            failed: this.buildSimulatedNotify(reference, payment._id.toString(), 'FAILED', itemName, amountStr, passphrase),
        }
        : null;

        return {
            paymentId: payment._id.toString(),
            reference, 
            amount, 
            itemName, 
            checkout: { ...checkoutFields, signature: checkoutSignature },
            simulation,
        };
    }

    async handleNotify(dto: PayfastNotifyDto): Promise<PayfastNotifyResultDto> {
        const payment = await this.paymentModel.findOne({ reference: dto.m_payment_id }).exec();
        if (!payment) {
            throw new NotFoundException('Onbekende betaalverwysing');
        }

        if (payment.status !== PaymentStatus.HANGENDE) {
            return { status: payment.status };
        }

        const passphrase = this.configService.get<string>('payfast.passphrase')!;
        const fields = this.notifyFields(dto.m_payment_id, dto.pf_payment_id, dto.payment_status, dto.item_name, dto.amount_gross);
        const expectedSignature = this.buildSignature(fields, passphrase);

        if (expectedSignature !== dto.signature) {
            payment.status = PaymentStatus.MISLUK;
            await payment.save();
            throw new ForbiddenException('Ongeldige betaal-handtekening');
        }

        if (dto.payment_status !== 'COMPLETE' || Number(dto.amount_gross) !== payment.amount) {
            payment.status = PaymentStatus.MISLUK;
            await payment.save();
            return { status: PaymentStatus.MISLUK };
        }

        await this.eventsService.decrementTicketsAvailable(payment.event.toString());
        const rsvp = await this.rsvpService.createPaidTicket(
            payment.event.toString(),
            payment.user.toString(),
            payment._id.toString(),
        );

        payment.status = PaymentStatus.VOLTOOI;
        payment.providerPaymentId = dto.pf_payment_id;
        payment.rsvp = rsvp._id;
        await payment.save();

        return { status: PaymentStatus.VOLTOOI };
    }

    private buildSimulatedNotify(
        mPaymentId: string,
        paymentDocId: string,
        outcome: 'COMPLETE' | 'FAILED',
        itemName: string,
        amountGross: string,
        passphrase: string,
    ) {
        const pfPaymentId = `SIM-${paymentDocId}`;
        const fields = this.notifyFields(mPaymentId, pfPaymentId, outcome, itemName, amountGross);
        return { ...fields, signature: this.buildSignature(fields, passphrase) };
    }

    private notifyFields(
        mPaymentId: string,
        pfPaymentId: string,
        paymentStatus: string,
        itemName: string,
        amountGross: string,
    ): PayfastNotifyFields {
        return {
            m_payment_id:   mPaymentId,
            pf_payment_id: pfPaymentId,
            payment_status: paymentStatus,
            item_name: itemName,
            amount_gross: amountGross,
        };
    }

    private buildSignature( fields: Record<string, string>, passphrase: string): string {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined || value === null || value === '') continue;
            parts.push(`${key}=${encodeURIComponent(value.trim()).replace(/%20/g, '+')}`);
        }
        let paramString = parts.join('&');
        if (passphrase) {
            paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
        }
        return createHash('md5').update(paramString).digest('hex');
    }
}