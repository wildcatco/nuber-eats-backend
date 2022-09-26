import { InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutputDto } from 'src/common/dtos/output.dto';
import { Verification } from '../entities/verification.entity';

@InputType()
export class VerifyEmailInput extends PickType(Verification, [
  'code',
] as const) {}

@ObjectType()
export class VerifyEmailOutput extends CoreOutputDto {}