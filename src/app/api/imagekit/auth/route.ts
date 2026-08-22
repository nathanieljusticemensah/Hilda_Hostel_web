import ImageKit from 'imagekit'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

export async function GET() {
  try {
    // Without this check, anyone -- including logged-out visitors -- could
    // hit this route directly and get valid signed upload credentials to
    // your ImageKit account, letting them upload arbitrary files at your
    // storage/bandwidth expense. Only signed-in users get a signature.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!publicKey || !privateKey || !urlEndpoint) {
      return NextResponse.json({ error: 'Missing ImageKit environment variables' }, { status: 500 })
    }

    const imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    })

    const auth = imagekit.getAuthenticationParameters()

    return NextResponse.json(auth)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate ImageKit authentication parameters' }, { status: 500 })
  }
}
