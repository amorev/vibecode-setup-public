import api from './index';

export interface PublicUser {
  id: number;
  login: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  login: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  login?: string;
  password?: string;
  role?: 'admin' | 'user';
}

export const getUsers = async (): Promise<PublicUser[]> => {
  const response = await api.get<PublicUser[]>('/api/users');
  return response.data;
};

export interface UserCountResponse {
  total: number;
  adminCount: number;
}

export const getUserCount = async (): Promise<UserCountResponse> => {
  const response = await api.get<UserCountResponse>('/api/users/count');
  return response.data;
};

export const createUser = async (data: CreateUserRequest): Promise<PublicUser> => {
  const response = await api.post<PublicUser>('/api/users', data);
  return response.data;
};

export const updateUser = async (id: number, data: UpdateUserRequest): Promise<PublicUser> => {
  const response = await api.patch<PublicUser>(`/api/users/${id}`, data);
  return response.data;
};

export interface DeleteUserResponse {
  deletedUserId: number;
  deletedRemindersCount: number;
}

export const deleteUser = async (id: number): Promise<DeleteUserResponse> => {
  const response = await api.delete<DeleteUserResponse>(`/api/users/${id}`);
  return response.data;
};
