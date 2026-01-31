// API Service for External Authentication and Data Fetching
const API_BASE_URL = 'http://block.mousumibd.org/api';

interface LoginCredentials {
    email: string;
    password: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    photo: string | null;
    branch_id: number;
    branch: Branch;
}

interface Branch {
    id: number;
    branch_name: string;
    branch_code: string;
    address: string;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

interface LoginResponse {
    user: User;
    token: string;
}

class ApiService {
    private token: string | null = null;

    constructor() {
        // Load token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('api_token');
        }
    }

    private getHeaders(includeAuth = false): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const result: ApiResponse<LoginResponse> = await response.json();

            if (result.success && result.data.token) {
                this.token = result.data.token;
                localStorage.setItem('api_token', this.token);
                localStorage.setItem('api_user', JSON.stringify(result.data.user));
            }

            return result.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async getCurrentUser(): Promise<User | null> {
        try {
            if (!this.token) {
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/auth/user`, {
                method: 'GET',
                headers: this.getHeaders(true),
            });

            if (!response.ok) {
                // Token expired or invalid
                this.clearAuth();
                return null;
            }

            const result: ApiResponse<User> = await response.json();

            if (result.success) {
                localStorage.setItem('api_user', JSON.stringify(result.data));
                return result.data;
            }

            return null;
        } catch (error) {
            console.error('Get user error:', error);
            this.clearAuth();
            return null;
        }
    }

    async getBranches(params?: {
        search?: string;
        sort_by?: string;
        sort_direction?: 'asc' | 'desc';
        all?: boolean;
    }): Promise<Branch[]> {
        try {
            if (!this.token) {
                throw new Error('Not authenticated');
            }

            const queryParams = new URLSearchParams();
            if (params?.search) queryParams.append('search', params.search);
            if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
            if (params?.sort_direction) queryParams.append('sort_direction', params.sort_direction);
            if (params?.all) queryParams.append('all', 'true');

            const url = `${API_BASE_URL}/branches${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(true),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch branches');
            }

            const result: ApiResponse<Branch[]> = await response.json();

            return result.data || [];
        } catch (error) {
            console.error('Get branches error:', error);
            throw error;
        }
    }

    async logout(): Promise<void> {
        try {
            if (this.token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: this.getHeaders(true),
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
        }
    }

    clearAuth(): void {
        this.token = null;
        localStorage.removeItem('api_token');
        localStorage.removeItem('api_user');
    }

    getStoredUser(): User | null {
        if (typeof window === 'undefined') return null;

        const userStr = localStorage.getItem('api_user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }
}

export const apiService = new ApiService();
export type { User, Branch, LoginCredentials };
