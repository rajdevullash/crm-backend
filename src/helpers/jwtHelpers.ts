/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

const createToken = (
  payload: any,
  secret: Secret,
  expireTime: SignOptions['expiresIn'],
): string => {
  const options: SignOptions = {
    expiresIn: expireTime,
    algorithm: 'HS256',
  };
  return jwt.sign(payload, secret, options);
};

const createResetToken = (
  payload: any,
  secret: Secret,
  expireTime: SignOptions['expiresIn'],
): string => {
  const options: SignOptions = {
    expiresIn: expireTime,
    algorithm: 'HS256',
  };

  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createResetToken,
};
