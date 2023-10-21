import { SignInAuthInputs, SignUpAuthInputs } from "@bright-resume/dto";
import { JwtService } from "@nestjs/jwt";
import {
  CustomError,
  USERNAME_OR_PASSWORD_IS_INCORRECT,
  USER_NOT_FOUND,
  USER_WITH_THIS_USERNAME_ALREADY_EXISTS,
} from "@bright-resume/errors";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  generateHashPassword,
  generateUserToken,
  verifyPassword,
} from "../../helpers";
import { User } from "../../models";
import { EnvironmentVariableTypeEnum } from "../../enums";

@Injectable()
export class UserService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>
  ) {}

  async profile(): Promise<User> {
    const user = await this.userModel.findOne();

    if (!user) {
      throw new CustomError(USER_NOT_FOUND);
    }

    return user;
  }

  async signIn(inputs: SignInAuthInputs): Promise<User> {
    const { password, username } = inputs;

    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new CustomError(USERNAME_OR_PASSWORD_IS_INCORRECT);
    }

    const isVerify = await verifyPassword(user.password, password);

    console.log({ isVerify });

    if (!isVerify) {
      throw new CustomError(USERNAME_OR_PASSWORD_IS_INCORRECT);
    }

    const token = await this.jwtService.signAsync(generateUserToken(user), {
      secret: configService.get(EnvironmentVariableTypeEnum.JWT_SECRET),
    });

    console.log({ token });

    user.token = token;

    return user;
  }

  async signUp(inputs: SignUpAuthInputs): Promise<User> {
    const { password, username, name } = inputs;

    const user = await this.userModel.findOne({ username });

    if (user) {
      throw new CustomError(USER_WITH_THIS_USERNAME_ALREADY_EXISTS);
    }

    const newUser = new this.userModel({
      username,
      name,
      password: await generateHashPassword(password),
    });

    const token = this.jwtService.sign(generateUserToken(user));

    await newUser.save();
    newUser.token = token;

    return newUser;
  }
}
