'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

type ModuleInfo = { id: string; courseId: string };

export default function LegacyModuleLessonsRedirect() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const moduleId = Array.isArray(params.moduleId) ? params.moduleId[0] : params.moduleId;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<ModuleInfo>(`/modules/${moduleId}`, { token })
      .then((m) => router.replace(`/courses/${m.courseId}`))
      .catch(() => router.replace('/courses'));
  }, [moduleId, router]);

  return null;
}
