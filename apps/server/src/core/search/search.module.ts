import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { KmSearchController } from './km-search.controller';
import { SearchService } from './search.service';
import { PublicSpaceModule } from '../public-space/public-space.module';

@Module({
  imports: [PublicSpaceModule],
  controllers: [SearchController, KmSearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
