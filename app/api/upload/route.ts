import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // In production, you would check authentication here
    // For development, we'll skip auth checks to allow testing without a database
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // 
    // // Check if user is admin
    // const isAdmin = (session.user as any)?.isAdmin;
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Process the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }, { status: 400 });
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop() || '';
    
    // Create a unique filename
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Ensure the uploads directory exists
    const uploadsDir = join(process.cwd(), 'public/uploads');
    const filePath = join(uploadsDir, fileName);
    
    // Ensure the uploads directory exists
    if (!existsSync(uploadsDir)) {
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (error) {
        console.error('Error creating uploads directory:', error);
        return NextResponse.json({ error: 'Failed to create uploads directory' }, { status: 500 });
      }
    }
    
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
    
    // Return the path to the uploaded file
    return NextResponse.json({ 
      success: true, 
      filePath: `/uploads/${fileName}`
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}