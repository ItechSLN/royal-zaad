import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Version,
  UseGuards,
} from '@nestjs/common';
import {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/contact.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ContactService } from './contact.service';

/** Messages per IP per 10 minutes — strict in production, relaxed for dev/tests. */
const CONTACT_RATE_LIMIT = Number(
  process.env.CONTACT_RATE_LIMIT ??
    (process.env.NODE_ENV === 'production' ? 5 : 1000),
);
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /** Public — the storefront contact form posts here. Limited per IP to stop inbox flooding. */
  @Throttle({ default: { limit: CONTACT_RATE_LIMIT, ttl: 10 * 60_000 } })
  @UseGuards(ThrottlerGuard)
  @Post()
  @Version('1')
  create(@Body() data: CreateContactDto) {
    return this.contactService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get()
  @Version('1')
  findAll(@Query() query: ContactQueryDto) {
    return this.contactService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateContactDto) {
    return this.contactService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
