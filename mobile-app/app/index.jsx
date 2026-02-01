import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const session = await authService.getSession();
      if (session) {
        router.replace('/(app)/dashboard');
      } else {
        router.replace('/(auth)/landing');
      }
    };
    check();
  }, []);

  return null;
}
