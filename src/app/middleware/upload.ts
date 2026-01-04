
import { Request } from 'express';
import config from '../config';
import s3 from '../utils/s3';




const uploadImage = async (
  req: Request,
  file?: Express.Multer.File, 
): Promise<string> => {
  const target = file ?? req.file; 

  if (!target) {
    throw new Error('Please upload a file');
  }

  const env = process.env.NODE_ENV;

  // production: S3
  if (env === 'production') {
    // console.log('from production',env);
    const params = {
      Bucket: config.aws_bucket_name as string,
      Key: `uploads/${Date.now()}-${target.originalname}`,
      Body: target.buffer,
      ContentType: target.mimetype,
    };

    const data = await s3.upload(params).promise();
    return data.Location;  // S3 URL
  }else{
// console.log('from else',env);
    
      //  development: local /uploads
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const localPath = `/uploads/${target.filename}`;
      return baseUrl + localPath;
  }
};


export default uploadImage;