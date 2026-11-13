import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import { AccountService } from './account.service';
import {
  AddWishlistItemDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/** Everything here is scoped to the signed-in customer. */
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  @Version('1')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.profile(user);
  }

  @Patch('profile')
  @Version('1')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(user, data);
  }

  @Post('password')
  @Version('1')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(user, data);
  }

  @Get('summary')
  @Version('1')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.summary(user);
  }

  @Get('wishlist')
  @Version('1')
  wishlist(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.wishlist(user);
  }

  @Post('wishlist')
  @Version('1')
  addToWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: AddWishlistItemDto,
  ) {
    return this.accountService.addToWishlist(user, data);
  }

  @Delete('wishlist/:productId')
  @Version('1')
  removeFromWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.accountService.removeFromWishlist(user, productId);
  }
}
