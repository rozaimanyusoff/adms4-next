import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/config/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret_key';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password, status FROM users WHERE email = ? OR username = ?',
      [email, email]
    );

    const users = rows as { id: number; email: string; password: string; status: number }[];

    if (users.length > 0) {
      const user = users[0];

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      if (user.status !== 1) {
        return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1d' });
      return NextResponse.json({ token }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}