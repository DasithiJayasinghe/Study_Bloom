import React from 'react';
import { BlossomRoutineShell } from '@/components/blossom-routine/BlossomRoutineShell';
import { BlossomRoutineDashboardContent } from '@/components/blossom-routine/BlossomRoutineDashboardContent';

export default function BlossomRoutineHomeScreen() {
  return (
    <BlossomRoutineShell>
      <BlossomRoutineDashboardContent />
    </BlossomRoutineShell>
  );
}
