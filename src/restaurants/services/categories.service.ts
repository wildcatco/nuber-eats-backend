import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CatchError } from 'src/common/common.decorators';
import { errorResponse, successResponse } from 'src/common/common.helpers';
import { Repository } from 'typeorm';
import { CategoriesOutput } from '../dtos/categories/categories.dto';
import { CategoryInput, CategoryOutput } from '../dtos/categories/category.dto';
import { Category } from '../entities/category.entity';
import { Restaurant } from '../entities/restaurant.entity';
import { CategoryRepository } from '../repositories/category.repository';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
    private readonly categoriesRepository: CategoryRepository,
  ) {}

  @CatchError('Failed to load categories')
  async allCategories(): Promise<CategoriesOutput> {
    const categories = await this.categoriesRepository.find();
    return successResponse<CategoriesOutput>({ categories });
  }

  countRestaurantsWithCategory(category: Category): Promise<number> {
    return this.restaurantsRepository.count({
      where: { category: { id: category.id } },
    });
  }

  @CatchError('Failed to find category')
  async findCategoryBySlug({
    slug,
    page,
    offset,
  }: CategoryInput): Promise<CategoryOutput> {
    const category = await this.categoriesRepository.findOne({
      where: { slug },
      relations: ['restaurants'],
    });
    if (!category) {
      return errorResponse('Category not found with given slug');
    }

    const restaurants = await this.restaurantsRepository.find({
      where: {
        category: { id: category.id },
      },
      take: offset,
      skip: (page - 1) * offset,
      order: {
        isPromoted: 'DESC',
      },
    });

    const totalResults = category.restaurants.length;
    return successResponse<CategoryOutput>({
      totalResults,
      totalPages: Math.ceil(totalResults / offset),
      category,
      restaurants,
    });
  }
}
