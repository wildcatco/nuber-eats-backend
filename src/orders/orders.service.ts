import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CatchError } from 'src/common/common.decorators';
import { errorResponse, successResponse } from 'src/common/common.helpers';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Dish)
    private readonly dishesRepository: Repository<Dish>,
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
  ) {}

  @CatchError('Failed to create order')
  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    const restaurant = await this.restaurantsRepository.findOneBy({
      id: restaurantId,
    });
    if (!restaurant) {
      return errorResponse('Restaurant not found with given id');
    }

    let orderFinalPrice = 0;
    const orderItems: OrderItem[] = [];
    for (const item of items) {
      const dish = await this.dishesRepository.findOneBy({ id: item.dishId });
      if (!dish) {
        return errorResponse('Dish not found with given id');
      }

      let dishFinalPrice = dish.price;
      for (const itemOption of item.options) {
        const dishOption = dish.options.find(
          (dishOption) => dishOption.name === itemOption.name,
        );
        if (dishOption) {
          if (dishOption.extra) {
            dishFinalPrice += dishOption.extra;
          } else {
            const dishOptionChoice = dishOption.choices.find(
              (optionChoice) => optionChoice.name === itemOption.choice,
            );
            if (dishOptionChoice && dishOptionChoice.extra) {
              dishFinalPrice += dishOptionChoice.extra;
            }
          }
        }
      }
      orderFinalPrice += dishFinalPrice;

      const orderItem = await this.orderItemsRepository.save(
        this.orderItemsRepository.create({
          dish,
          options: item.options,
        }),
      );
      orderItems.push(orderItem);
    }

    await this.ordersRepository.save(
      this.ordersRepository.create({
        customer,
        restaurant,
        total: orderFinalPrice,
        items: orderItems,
      }),
    );

    return successResponse();
  }

  @CatchError('Failed to load orders')
  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    let orders: Order[];
    if (user.role === UserRole.Client) {
      orders = await this.ordersRepository.findBy({
        customer: { id: user.id },
        status,
      });
    } else if (user.role === UserRole.Delivery) {
      orders = await this.ordersRepository.findBy({
        driver: { id: user.id },
        status,
      });
    } else if (user.role === UserRole.Owner) {
      const restaurants = await this.restaurantsRepository.find({
        where: {
          owner: { id: user.id },
        },
        relations: ['orders'],
      });

      orders = restaurants.map((restaurant) => restaurant.orders).flat();
      if (status) {
        orders = orders.filter((order) => order.status === status);
      }
    }

    return successResponse<GetOrdersOutput>({
      orders,
    });
  }

  @CatchError('Failed to load order')
  async getOrder(
    user: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrdersOutput> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['restaurant'],
    });

    if (!order) {
      return errorResponse('Order not found with given id');
    }

    if (
      order.customerId !== user.id &&
      order.driverId !== user.id &&
      order.restaurant.ownerId !== user.id
    ) {
      return errorResponse('You cannot see this order');
    }

    return successResponse<GetOrderOutput>({
      order,
    });
  }
}
