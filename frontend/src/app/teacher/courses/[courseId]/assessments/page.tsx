'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyTeacherCourseAssessmentsRedirect() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  useEffect(() => {
    router.replace(`/teacher/courses/${courseId}?tab=avaliacoes`);
  }, [courseId, router]);

  return null;
}
