import { Controller, Get, Query, UseGuards, Version } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { GeoLookupQueryDto, NearbyShopsQueryDto, SearchProductsQueryDto } from './dto/search.dto';

/** Lookups proxy an external geocoder, so they are limited per IP. */
const GEO_LOOKUP_LIMIT = Number(
  process.env.GEO_LOOKUP_RATE_LIMIT ?? (process.env.NODE_ENV === 'production' ? 30 : 1000),
);

/** Public marketplace discovery. */
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search/products')
  @Version('1')
  search(@Query() query: SearchProductsQueryDto) {
    return this.searchService.search(query);
  }

  @Get('search/shops')
  @Version('1')
  nearbyShops(@Query() query: NearbyShopsQueryDto) {
    return this.searchService.nearbyShops(query);
  }

  @Get('geo/lookup')
  @Version('1')
  @Throttle({ default: { limit: GEO_LOOKUP_LIMIT, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  lookup(@Query() query: GeoLookupQueryDto) {
    return this.searchService.lookup(query);
  }
}
