// ========== Imports: ==========
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { PendingReviewDto } from './dto/pending-review.dto';
import { ReviewEligibilityDto } from './dto/review-eligibility.dto';
import { MyReviewStateDto } from './dto/my-review-state.dto';
import { ReviewSummaryDto } from './dto/review-summary.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() dto: CreateReviewDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReviewResponseDto> {
        const review = await this.reviewsService.create(dto, user.sub);
        return ReviewResponseDto.fromDocument(review);
    }

    @Get('pending')
    findPending(@CurrentUser() user: JwtPayload): Promise<PendingReviewDto[]> {
        return this.reviewsService.findPending(user.sub);
    }

    @Get('mine')
    getMine(@CurrentUser() user: JwtPayload): Promise<MyReviewStateDto> {
        return this.reviewsService.getMyReviewState(user.sub);
    }

    @Get('eligibility/:eventId')
    getEligibility(
        @Param('eventId') eventId: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReviewEligibilityDto> {
        return this.reviewsService.getEligibility(eventId, user.sub);
    }

    @Get('event/:eventId')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.DOSENT)
    getEventSummary(
        @Param('eventId') eventId: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReviewSummaryDto> {
        return this.reviewsService.getEventSummary(eventId, user.sub, user.role);
    }
}
