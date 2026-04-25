const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const uploadFile = async (file) => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExtension}`;
  
  const uploadParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await r2Client.send(new PutObjectCommand(uploadParams));
    
    // Retorna a URL pública configurada
    const publicUrl = process.env.R2_PUBLIC_URL.endsWith('/') 
      ? process.env.R2_PUBLIC_URL 
      : `${process.env.R2_PUBLIC_URL}/`;
      
    return {
      fileName: fileName,
      url: `${publicUrl}${fileName}`
    };
  } catch (err) {
    console.error('R2 Upload Error:', err);
    throw new Error('Falha no upload para o Cloudflare R2');
  }
};

const deleteFile = async (fileName) => {
  const deleteParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
  };

  try {
    await r2Client.send(new DeleteObjectCommand(deleteParams));
    return true;
  } catch (err) {
    console.error('R2 Delete Error:', err);
    throw new Error('Falha ao deletar arquivo do R2');
  }
};

const listFiles = async () => {
  const listParams = {
    Bucket: process.env.R2_BUCKET_NAME,
  };

  try {
    const data = await r2Client.send(new ListObjectsV2Command(listParams));
    const publicUrl = process.env.R2_PUBLIC_URL.endsWith('/') 
      ? process.env.R2_PUBLIC_URL 
      : `${process.env.R2_PUBLIC_URL}/`;

    return (data.Contents || []).map(file => ({
      name: file.Key,
      size: file.Size,
      updatedAt: file.LastModified,
      url: `${publicUrl}${file.Key}`
    }));
  } catch (err) {
    console.error('R2 List Error:', err);
    throw new Error('Falha ao listar arquivos do R2');
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  listFiles
};
