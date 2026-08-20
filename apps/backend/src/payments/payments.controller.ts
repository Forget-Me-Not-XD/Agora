// ========== Imports: ==========
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { InitiatePaymentResponseDto } from './dto/initiate-payment-response.dto';
import { PayfastNotifyDto, PayfastNotifyResultDto } from './dto/payfast-notify.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('initiate')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async initiate(
        @Body() dto: InitiatePaymentDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<InitiatePaymentResponseDto> {
        return this.paymentsService.initiate(dto.eventId, user.sub);
    }

    @Post('notify')
    @HttpCode(HttpStatus.OK)
    async notify(@Body() dto: PayfastNotifyDto): Promise<PayfastNotifyResultDto> {
        return this.paymentsService.handleNotify(dto);
    }
}
