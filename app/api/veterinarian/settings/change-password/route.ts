import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    // 1. Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // 2. Auth Check & Get Email
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create a temporary client to get the user's email
    // We use the ANON key here because we just need to read the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Invalid session or email not found.' },
        { status: 401 }
      );
    }

    // 3. Verify Old Password & Create Update Session
    // We create a FRESH client instance to handle the sign-in
    const sessionClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Attempt to log in with the OLD password
    const { error: signInError } = await sessionClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    // 4. Update Password (SAFER METHOD)
    // Instead of using the Admin client, we use 'sessionClient'.
    // This client is now authenticated as the user, so it has permission to update itself.
    const { error: updateError } = await sessionClient.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update password.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Password updated successfully.' });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}