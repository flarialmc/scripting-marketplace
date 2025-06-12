export interface Script {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloadUrl: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  imageUrl:string;
  type: 'module' | 'command'; 
}