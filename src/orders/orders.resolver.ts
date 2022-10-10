import { Inject } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { Roles } from 'src/auth/roles.decorator';
import { NEW_PENDING_ORDER, PUB_SUB } from 'src/common/common.constants';
import { User } from 'src/users/entities/user.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

@Resolver((of) => Order)
export class OrdersResolver {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation((returns) => CreateOrderOutput)
  @Roles('Client')
  createOrder(
    @AuthUser() authUser: User,
    @Args('input') createOrderInput: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    return this.ordersService.createOrder(authUser, createOrderInput);
  }

  @Query((returns) => GetOrdersOutput)
  @Roles('Any')
  getOrders(
    @AuthUser() authUser: User,
    @Args('input') getOrdersInput: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    return this.ordersService.getOrders(authUser, getOrdersInput);
  }

  @Query((returns) => GetOrderOutput)
  @Roles('Any')
  getOrder(
    @AuthUser() authUser: User,
    @Args('input') getOrderInput: GetOrderInput,
  ): Promise<GetOrderOutput> {
    return this.ordersService.getOrder(authUser, getOrderInput);
  }

  @Mutation((returns) => EditOrderOutput)
  @Roles('Owner', 'Delivery')
  editOrder(
    @AuthUser() authUser: User,
    @Args('input') editOrderInput: EditOrderInput,
  ): Promise<EditOrderOutput> {
    return this.ordersService.editOrder(authUser, editOrderInput);
  }

  @Subscription((returns) => Order, {
    filter: ({ pendingOrders: { ownerId } }, _, context) => {
      return ownerId === context.user.id;
    },
    resolve: ({ pendingOrders: { order } }) => {
      return order;
    },
  })
  @Roles('Owner')
  pendingOrders() {
    return this.pubSub.asyncIterator(NEW_PENDING_ORDER);
  }
}
