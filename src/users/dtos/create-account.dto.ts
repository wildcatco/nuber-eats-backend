import { InputType, ObjectType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';
import { CoreOutputDto } from './../../common/dtos/output.dto';

@InputType()
export class CreateAccountInput extends PickType(User, [
  'email',
  'password',
  'role',
] as const) {}

@ObjectType()
export class CreateAccountOutput extends CoreOutputDto {}
