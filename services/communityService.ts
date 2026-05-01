import { authService } from './authService';
import { Post, Comment as CommunityComment } from './communityTypes';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

export const communityService = {
    // Get all posts with optional filters
    async getPosts(params?: {
        search?: string;
        type?: string;
        subject?: string;
        sort?: string;
        mine?: boolean;
    }): Promise<Post[]> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.type && params.type !== 'all') query.append('type', params.type);
        if (params?.subject) query.append('subject', params.subject);
        if (params?.sort) query.append('sort', params.sort);
        if (params?.mine) query.append('mine', 'true');

        const url = `${API_URL}/community/posts${query.toString() ? '?' + query.toString() : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch posts');
        return data.posts;
    },

    // Get single post by ID
    async getPostById(postId: string): Promise<Post> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch post');
        return data.post;
    },

    // Create a new post
    async createPost(formData: FormData): Promise<Post> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create post');
        return data.post;
    },

    // Update a post
    async updatePost(postId: string, formData: FormData): Promise<Post> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update post');
        return data.post;
    },

    // Delete a post
    async deletePost(postId: string): Promise<void> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete post');
    },

    // Get comments for a post
    async getComments(postId: string): Promise<CommunityComment[]> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}/comments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch comments');
        return data.comments;
    },

    // Add a comment
    async addComment(postId: string, content: string, parentComment?: string): Promise<CommunityComment> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content, parentComment }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to add comment');
        return data.comment;
    },

    // Delete a comment
    async deleteComment(postId: string, commentId: string): Promise<void> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete comment');
    },

    // Vote on a post
    async votePost(postId: string, type: 'upvote' | 'downvote'): Promise<{
        upvotes: number;
        downvotes: number;
        userVote: string | null;
    }> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ type }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to vote');
        return data;
    },

    // Vote on a poll
    async votePoll(postId: string, optionIndex: number): Promise<{
        pollOptions: Array<{ optionText: string; voteCount: number }>;
        userPollVote: number;
    }> {
        const token = await authService.getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_URL}/community/posts/${postId}/poll-vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ optionIndex }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to vote on poll');
        return data;
    },
    // Helper to get full file URL
    getFileUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = API_URL.replace('/api', '');
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    },
};
