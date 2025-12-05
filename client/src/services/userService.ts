export interface User{
    id: string;
    email: string;
}

const API_URL = "http://localhost:8080/api";

export const userService = {
    getAllUsers: async (token: string) : Promise<User[]> => {
        const response = await fetch(`${API_URL}/users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if(!response.ok){
            throw new Error('Failed to fetch users');
        }

        return response.json();
    }
}