import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CfAccessController } from './cf-access.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WorkspaceModule } from '../workspace/workspace.module';
import { SignupService } from './services/signup.service';
import { TokenModule } from './token.module';

@Module({
  imports: [TokenModule, WorkspaceModule],
  controllers: [AuthController, CfAccessController],
  providers: [AuthService, SignupService, JwtStrategy],
  exports: [SignupService],
})
export class AuthModule {}
