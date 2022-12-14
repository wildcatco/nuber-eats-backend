import { Injectable } from '@nestjs/common/decorators';
import { Interval } from '@nestjs/schedule/dist';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from 'src/payments/entities/payment.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import { CatchError } from './../common/common.decorators';
import { errorResponse, successResponse } from './../common/common.helpers';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from './dtos/create-payment.dto';
import { GetPaymentsOutput } from './dtos/get-payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
  ) {}

  @CatchError('Failed to create payment')
  async createPayment(
    owner: User,
    { transactionId, restaurantId }: CreatePaymentInput,
  ): Promise<CreatePaymentOutput> {
    const restaurant = await this.restaurantsRepository.findOneBy({
      id: restaurantId,
    });
    if (!restaurant) {
      return errorResponse('Restaurant not found with given id');
    }
    if (restaurant.ownerId !== owner.id) {
      return errorResponse('Only owner of the restaurant can create payment');
    }

    restaurant.isPromoted = true;

    const date = new Date();
    date.setDate(date.getDate() + 7);
    restaurant.promotedUntil = date;

    await this.restaurantsRepository.save(restaurant);

    await this.paymentsRepository.save(
      this.paymentsRepository.create({
        transactionId,
        restaurant,
        user: owner,
      }),
    );

    return successResponse();
  }

  @CatchError('Failed to load payments')
  async getPayments(user: User): Promise<GetPaymentsOutput> {
    const payments = await this.paymentsRepository.findBy({
      user: { id: user.id },
    });

    return successResponse<GetPaymentsOutput>({
      payments,
    });
  }

  @Interval(2000)
  async checkPromotedRestaurants() {
    const restaurants = await this.restaurantsRepository.findBy({
      isPromoted: true,
      promotedUntil: LessThan(new Date()),
    });

    restaurants.forEach((restaurant) => {
      restaurant.isPromoted = false;
      restaurant.promotedUntil = null;
    });
    await this.restaurantsRepository.save(restaurants);
  }
}
