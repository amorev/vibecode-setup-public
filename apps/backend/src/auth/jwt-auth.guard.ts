import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  canActivate(context: ExecutionContext) {
    // Check for @Public() decorator on handler or controller
    const handler = context.getHandler();
    const controller = context.getClass();
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, handler)
      || Reflect.getMetadata(IS_PUBLIC_KEY, controller);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
