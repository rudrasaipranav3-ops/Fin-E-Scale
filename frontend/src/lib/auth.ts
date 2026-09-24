import { SignJWT, jwtVerify } from "jose";

export type AuthTokenPayload = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured in .env.local"
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAuthToken(
  payload: AuthTokenPayload
) {
  return new SignJWT({
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(
  token: string
) {
  const { payload } = await jwtVerify(
    token,
    getJwtSecret()
  );

  return payload;
}