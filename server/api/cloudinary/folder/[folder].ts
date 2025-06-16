export default defineEventHandler(async (event) => {
  const folder = getRouterParam(event, 'folder')
  
  if (!folder) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder parameter is required'
    })
  }

  try {
    // Cloudinary Admin API endpoint for listing resources by folder
    const cloudName = 'doj03xgr2'
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    

    
    if (!apiKey || !apiSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Cloudinary credentials not configured'
      })
    }

    // Create basic auth header
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    
    // Use Admin API to get resources by folder prefix
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?type=upload&prefix=${folder}/&max_results=500`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw createError({
        statusCode: response.status,
        statusMessage: `Cloudinary API error: ${response.statusText} - ${errorText}`
      })
    }

    const data = await response.json()
    
    // Transform the response to match your existing format
    const resources = data.resources.map((img: any) => ({
      publicId: img.public_id,
      format: img.format,
      version: img.version,
      url: `https://res.cloudinary.com/${cloudName}/image/upload/c_scale,w_800/${img.public_id}.${img.format}`,
      originalUrl: `https://res.cloudinary.com/${cloudName}/image/upload/${img.public_id}.${img.format}`,
      width: img.width,
      height: img.height,
      aspectRatio: img.width / img.height,
      source: folder
    }))

    return { resources }
  } catch (error) {
    console.error('Error fetching Cloudinary folder:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch images from Cloudinary'
    })
  }
}) 