import { Stack } from 'expo-router';
import React from 'react';

export default function PublicCommunityLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="create-post" />
            <Stack.Screen name="post-detail" />
        </Stack>
    );
}
