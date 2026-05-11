'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyCourseModulesRedirect() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  useEffect(() => {
    router.replace(`/courses/${courseId}`);
  }, [courseId, router]);

  return null;
}
