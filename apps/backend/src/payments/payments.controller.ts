// ========== Imports: ==========
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { InitiatePaymentResponseDto } from './dto/initiate-payment-response.dto';
import { PayfastNotifyDto, PayfastNotifyResultDto } from './dto/payfast-notify.dto';

// Slegs hierdie velde word ooit as verskuilde form-inputs uitgevoer -- 'n
// onverwagte query-parameter word eenvoudig geïgnoreer i.p.v. in die HTML
// beland (sien serveCheckoutRedirect hieronder).
const CHECKOUT_FIELD_NAMES = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'm_payment_id', 'amount', 'item_name', 'signature',
] as const;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly config: ConfigService,
    ) {}

    @Post('initiate')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async initiate(
        @Body() dto: InitiatePaymentDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<InitiatePaymentResponseDto> {
        return this.paymentsService.initiate(dto.eventId, user.sub, dto.platform);
    }

    @Post('notify')
    @HttpCode(HttpStatus.OK)
    async notify(@Body() dto: PayfastNotifyDto): Promise<PayfastNotifyResultDto> {
        return this.paymentsService.handleNotify(dto);
    }

    // PayFast POST ons eie ITN (notify) direk server-tot-server om die kaartjie te
    // skep -- hierdie twee roetes hieronder is bloot die blaaier-herleiding ná
    // afloop, sodat die gebruiker weer by die regte app (web of mobiel) uitkom.
    // Moenie hierop staatmaak vir betaalbevestiging nie, net vir navigasie.
    @Get('return')
    handleReturn(@Query('platform') platform: string | undefined, @Res() res: Response): void {
        res.redirect(this.buildLandingUrl(platform, 'payment=success'));
    }

    @Get('cancel')
    handleCancel(@Query('platform') platform: string | undefined, @Res() res: Response): void {
        res.redirect(this.buildLandingUrl(platform, 'payment=cancelled'));
    }

    // React Native het geen DOM om 'n POST-form mee te bou en in te dien nie (só
    // stuur die web-weergawe sy velde na PayFast) -- hierdie bladsy bestaan net om
    // 'n regte blaaierkonteks (oopgemaak deur expo-web-browser) daardie selfde
    // POST namens mobiel te laat doen. Die velde kom reeds klaar-onderteken van
    // /payments/initiate af; hier word hulle net getrou in 'n form weerspieël.
    @Get('checkout-redirect')
    serveCheckoutRedirect(@Query() query: Record<string, string>, @Res() res: Response): void {
        const processUrl = this.config.get<string>('payfast.processUrl')!;
        const inputs = CHECKOUT_FIELD_NAMES
            .filter((name) => typeof query[name] === 'string')
            .map((name) => `<input type="hidden" name="${name}" value="${escapeHtml(query[name])}">`)
            .join('\n');

        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Word na PayFast herlei...</title></head>
<body onload="document.forms[0].submit()">
    <form method="POST" action="${escapeHtml(processUrl)}">${inputs}</form>
    <p>Word na PayFast herlei&hellip;</p>
</body>
</html>`;

        res.set('Content-Type', 'text/html').send(html);
    }

    private buildLandingUrl(platform: string | undefined, query: string): string {
        if (platform === 'mobile') {
            const mobileScheme = this.config.get<string>('oauth.mobileScheme');
            return `${mobileScheme}://payment-callback?${query}`;
        }
        return `${this.config.get<string>('frontendUrl')}/events?${query}`;
    }
}
