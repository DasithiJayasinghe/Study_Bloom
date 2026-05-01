export interface PostUser {
    _id: string;
    fullName: string;
    profilePicture: string | null;
}

export interface PollOption {
    _id: string;
    optionText: string;
    voteCount: number;
}

export interface Post {
    _id: string;
    title: string;
    content: string;
    type: 'question' | 'material' | 'discussion' | 'poll';
    subject: string;
    fileURL: string | null;
    user: PostUser;
    pollOptions: PollOption[];
    upvotes: number;
    downvotes: number;
    commentCount: number;
    userVote: 'upvote' | 'downvote' | null;
    userPollVote?: number | null;
    isOwn?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    _id: string;
    postId: string;
    userId: PostUser;
    content: string;
    fileURL: string | null;
    parentComment: string | null;
    isOwn: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePostData {
    title: string;
    content: string;
    type: string;
    subject: string;
    pollOptions?: string[];
}
