import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal,
    Image,
    Linking,
    Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { communityService } from '@/services/communityService';
import { Post, Comment as CommunityComment } from '@/services/communityTypes';

const COLORS = {
    background: '#fff3ff',
    surface: '#ffffff',
    surfaceContainerHigh: '#eeddf1',
    surfaceContainerLow: '#fbecfe',
    surfaceVariant: '#e8d7ed',
    primary: '#b7004d',
    secondary: '#9720ab',
    onSurface: '#342c38',
    onSurfaceVariant: '#625865',
    outline: '#7e7381',
    gradientStart: '#D81B60',
    gradientEnd: '#9C27B0',
    error: '#b31b25',
};

function getTimeAgo(dateString?: string): string {
    if (!dateString) return ''; // Return empty string if date is missing

    const now = new Date();
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return ''; // Or return a default like 'Invalid date'
    }

    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function PostDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { postId } = useLocalSearchParams<{ postId: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [selectedPollOption, setSelectedPollOption] = useState<number | null>(null);
    const [bookmarked, setBookmarked] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
    const pollAnimations = useRef<Animated.Value[]>([]);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [hasKeyboardInteracted, setHasKeyboardInteracted] = useState(false);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setIsKeyboardVisible(true);
            setHasKeyboardInteracted(true);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        loadData();
    }, [postId]);

    const loadData = async () => {
        if (!postId) return;
        try {
            setLoading(true);
            const [postData, commentsData] = await Promise.all([
                communityService.getPostById(postId),
                communityService.getComments(postId),
            ]);
            setPost(postData);
            setComments(commentsData);
            if (postData.userPollVote !== null && postData.userPollVote !== undefined) {
                setSelectedPollOption(postData.userPollVote);
            }
            // Init poll animations
            if (postData.pollOptions?.length) {
                pollAnimations.current = postData.pollOptions.map(() => new Animated.Value(0));
                animatePollBars(postData);
            }
        } catch (error) {
            console.error('Error loading post:', error);
        } finally {
            setLoading(false);
        }
    };

    const animatePollBars = (postData: Post) => {
        const total = postData.pollOptions.reduce((s, o) => s + o.voteCount, 0);
        postData.pollOptions.forEach((opt, idx) => {
            const pct = total > 0 ? opt.voteCount / total : 0;
            Animated.timing(pollAnimations.current[idx], {
                toValue: pct,
                duration: 600,
                useNativeDriver: false,
            }).start();
        });
    };

    const handlePollVote = async (optionIndex: number) => {
        if (!post) return;
        try {
            const result = await communityService.votePoll(post._id, optionIndex);
            setSelectedPollOption(result.userPollVote);
            const updatedPost = {
                ...post,
                pollOptions: result.pollOptions.map((o, i) => ({
                    ...post.pollOptions[i],
                    ...o,
                })),
                userPollVote: result.userPollVote,
            };
            setPost(updatedPost);
            animatePollBars(updatedPost);
        } catch (error) {
            console.error('Error voting on poll:', error);
        }
    };

    const handleVote = async (type: 'upvote' | 'downvote') => {
        if (!post) return;
        try {
            const result = await communityService.votePost(post._id, type);
            setPost((prev) =>
                prev
                    ? {
                        ...prev,
                        upvotes: result.upvotes,
                        downvotes: result.downvotes,
                        userVote: result.userVote as any,
                    }
                    : prev
            );
        } catch (error) {
            console.error('Error voting:', error);
        }
    };

    const handleSubmitComment = async () => {
        if (!commentText.trim() || !post) return;
        try {
            setSubmittingComment(true);
            const newComment = await communityService.addComment(
                post._id,
                commentText.trim(),
                replyingTo?.id || undefined
            );
            setComments((prev) => [newComment, ...prev]);
            setCommentText('');
            setReplyingTo(null);
            setPost((prev) => (prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!post) return;
        try {
            await communityService.deleteComment(post._id, commentId);
            setComments((prev) => prev.filter((c) => c._id !== commentId));
            setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 1) - 1) } : prev));
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const handleDeletePost = async () => {
        if (!post) return;
        setMenuVisible(false);
        try {
            await communityService.deletePost(post._id);
            router.back();
        } catch (error: any) {
            console.error('Error deleting post:', error);
        }
    };

    const handleEditPost = () => {
        if (!post) return;
        setMenuVisible(false);
        router.push({
            pathname: '/public-community/create-post',
            params: {
                editPostId: post._id,
                editTitle: post.title,
                editContent: post.content || '',
                editType: post.type,
                editSubject: post.subject || '',
            },
        } as any);
    };

    const handleHidePost = () => {
        setMenuVisible(false);
        router.back();
    };

    const handleImagePress = (uri: string) => {
        setSelectedImage(uri);
        setShowImageModal(true);
    };

    const handleBookmarkPress = () => {
        if (!post) return;
        setBookmarked((prev) => !prev);
        router.push({
            pathname: '/study-space/save-to-my-space',
            params: {
                title: post.title || 'Saved Community Post',
                content: post.content || '',
                authorName: post.user?.fullName || 'Community Member',
                authorAvatar: post.user?.profilePicture ? communityService.getFileUrl(post.user.profilePicture) : '',
                attachmentUrl: post.fileURL ? communityService.getFileUrl(post.fileURL) : '',
            },
        } as any);
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: COLORS.onSurface }}>Post not found</Text>
            </View>
        );
    }

    const totalVotes = post.upvotes - post.downvotes;
    const totalPollVotes = post.pollOptions?.reduce((s, o) => s + o.voteCount, 0) || 0;

    const getChildComments = (parentId: string | null) =>
        comments.filter((c) => (c.parentComment || null) === parentId);

    const renderCommentThread = (comment: CommunityComment, depth = 0): React.ReactNode => {
        const childReplies = getChildComments(comment._id);
        const isTopLevel = depth === 0;

        return (
            <View key={comment._id}>
                <View
                    style={
                        isTopLevel
                            ? styles.commentCard
                            : [
                                styles.replyCard,
                                {
                                    marginLeft: Math.min(24 + (depth - 1) * 16, 84),
                                    backgroundColor: depth >= 2 ? '#fefcff' : '#f9f0ff',
                                    borderLeftWidth: 2,
                                    borderLeftColor: depth >= 2 ? '#e8dff3' : '#ddc9ea',
                                },
                            ]
                    }
                >
                    {comment.userId?.profilePicture ? (
                        <Image
                            source={{ uri: communityService.getFileUrl(comment.userId.profilePicture) }}
                            style={isTopLevel ? styles.commentAvatarImg : styles.replyAvatarImg}
                        />
                    ) : (
                        <View style={isTopLevel ? styles.commentAvatarSmall : styles.replyAvatar}>
                            <MaterialIcons name="person" size={isTopLevel ? 16 : 14} color={COLORS.onSurfaceVariant} />
                        </View>
                    )}

                    <View style={{ flex: 1 }}>
                        <View style={styles.commentNameRow}>
                            <Text style={styles.commentName}>{comment.userId?.fullName || 'User'}</Text>
                            <Text style={styles.commentTime}>{getTimeAgo(comment.createdAt)}</Text>
                        </View>

                        <Text style={styles.commentText}>{comment.content}</Text>

                        <TouchableOpacity
                            style={styles.replyBtn}
                            onPress={() => setReplyingTo({ id: comment._id, name: comment.userId?.fullName || 'User' })}
                        >
                            <MaterialIcons name="reply" size={14} color={COLORS.outline} />
                            <Text style={styles.replyBtnText}>Reply</Text>
                        </TouchableOpacity>
                    </View>

                    {comment.isOwn && (
                        <TouchableOpacity
                            style={styles.deleteCommentBtn}
                            onPress={() => handleDeleteComment(comment._id)}
                        >
                            <MaterialIcons name="delete-outline" size={18} color="#f48fb1" />
                        </TouchableOpacity>
                    )}
                </View>

                {childReplies.map((reply) => renderCommentThread(reply, depth + 1))}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: COLORS.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={[styles.header, { zIndex: 100 }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Post Detail</Text>
                    </View>
                    <View style={[styles.headerRight, { zIndex: 100 }]}>
                        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
                            <MaterialIcons name="more-vert" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        {menuVisible && (
                            <View style={styles.dropdownMenu}>
                                {post.isOwn && (
                                    <TouchableOpacity style={styles.dropdownItem} onPress={handleEditPost}>
                                        <MaterialIcons name="edit" size={18} color={COLORS.primary} />
                                        <Text style={[styles.dropdownText, { color: COLORS.primary }]}>Edit</Text>
                                    </TouchableOpacity>
                                )}
                                {post.isOwn && (
                                    <TouchableOpacity style={styles.dropdownItem} onPress={handleDeletePost}>
                                        <MaterialIcons name="delete-outline" size={18} color={COLORS.error} />
                                        <Text style={[styles.dropdownText, { color: COLORS.error }]}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.dropdownItem} onPress={handleHidePost}>
                                    <MaterialIcons name="visibility-off" size={18} color={COLORS.onSurfaceVariant} />
                                    <Text style={styles.dropdownText}>Hide</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Main Post Card */}
                    <View style={styles.mainCard}>
                        {/* Badge Row */}
                        <View style={styles.badgeRow}>
                            <View style={styles.typePill}>
                                <Text style={styles.typePillText}>{post.type.toUpperCase()}</Text>
                            </View>
                            {post.subject ? (
                                <View style={styles.subjectPill}>
                                    <Text style={styles.subjectPillText}>{post.subject.toUpperCase()}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Title */}
                        <Text style={styles.postTitle}>{post.title}</Text>

                        {/* Author Row */}
                        <View style={styles.authorRow}>
                            {post.user?.profilePicture ? (
                                <Image
                                    source={{ uri: communityService.getFileUrl(post.user.profilePicture) }}
                                    style={styles.avatarImg}
                                />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <MaterialIcons name="person" size={20} color={COLORS.onSurfaceVariant} />
                                </View>
                            )}
                            <View>
                                <Text style={styles.authorName}>{post.user?.fullName || 'Unknown'}</Text>
                                <Text style={styles.authorTimestamp}>POSTED {getTimeAgo(post.createdAt)}</Text>
                            </View>
                        </View>

                        {/* Body Text */}
                        {post.content ? (
                            <Text style={styles.bodyText}>{post.content}</Text>
                        ) : null}

                        {/* Attachments */}
                        {post.fileURL && (
                            <View style={styles.attachmentSection}>
                                {post.fileURL.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => handleImagePress(communityService.getFileUrl(post.fileURL!))}
                                    >
                                        <Image
                                            source={{ uri: communityService.getFileUrl(post.fileURL) }}
                                            style={styles.attachedImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.expandHint}>
                                            <MaterialIcons name="fullscreen" size={20} color="#fff" />
                                            <Text style={styles.expandHintText}>Tap to expand</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.fileLink}
                                        onPress={() => WebBrowser.openBrowserAsync(communityService.getFileUrl(post.fileURL!))}
                                    >
                                        <MaterialIcons name="insert-drive-file" size={32} color={COLORS.secondary} />
                                        <View>
                                            <Text style={styles.fileName}>{post.fileURL.split('/').pop()}</Text>
                                            <Text style={styles.fileSize}>Tap to view attachment</Text>
                                        </View>
                                        <MaterialIcons name="download" size={24} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Poll Card */}
                        {post.type === 'poll' && post.pollOptions?.length > 0 && (
                            <View style={styles.pollCard}>
                                <View style={styles.pollCardHeader}>
                                    <Text style={styles.pollHeaderLabel}>STUDY FOCUS POLL</Text>
                                    <Text style={styles.pollVoteCount}>{totalPollVotes.toLocaleString()} VOTES</Text>
                                </View>

                                {post.pollOptions.map((opt, idx) => {
                                    const pct = totalPollVotes > 0 ? Math.round((opt.voteCount / totalPollVotes) * 100) : 0;
                                    const isSelected = selectedPollOption === idx;
                                    const animWidth = pollAnimations.current[idx]
                                        ? pollAnimations.current[idx].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%'],
                                        })
                                        : '0%';

                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[
                                                styles.pollOptionBtn,
                                                isSelected && { borderWidth: 2, borderColor: COLORS.secondary },
                                            ]}
                                            onPress={() => handlePollVote(idx)}
                                            activeOpacity={0.7}
                                        >
                                            <Animated.View
                                                style={[
                                                    styles.pollOptionFill,
                                                    {
                                                        width: animWidth as any,
                                                        backgroundColor: isSelected ? 'rgba(151,32,171,0.1)' : '#f3e5f5',
                                                    },
                                                ]}
                                            />
                                            <View style={styles.pollOptionContent}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.pollOptionLabel}>{opt.optionText}</Text>
                                                    {isSelected && (
                                                        <MaterialIcons name="check-circle" size={18} color={COLORS.secondary} />
                                                    )}
                                                </View>
                                                <Text style={styles.pollOptionPercent}>{pct}%</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <Text style={styles.pollFooterText}>Click an option to vote</Text>
                            </View>
                        )}

                        {/* Interaction Row */}
                        <View style={styles.interactionRow}>
                            <View style={styles.votePill}>
                                <TouchableOpacity onPress={() => handleVote('upvote')}>
                                    <MaterialIcons
                                        name="arrow-upward"
                                        size={18}
                                        color={post.userVote === 'upvote' ? COLORS.primary : COLORS.outline}
                                    />
                                </TouchableOpacity>
                                <Text style={styles.voteCount}>{totalVotes}</Text>
                                <TouchableOpacity onPress={() => handleVote('downvote')}>
                                    <MaterialIcons
                                        name="arrow-downward"
                                        size={18}
                                        color={post.userVote === 'downvote' ? COLORS.primary : COLORS.outline}
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.interactionRight}>
                                <TouchableOpacity
                                    style={styles.circleBtn}
                                    onPress={handleBookmarkPress}
                                >
                                    <MaterialIcons
                                        name={bookmarked ? 'bookmark' : 'bookmark-border'}
                                        size={22}
                                        color={bookmarked ? COLORS.secondary : COLORS.onSurfaceVariant}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Comments Section */}
                    <View style={styles.commentsSection}>
                        <View style={styles.commentsHeader}>
                            <Text style={styles.commentsTitle}>Comments ({post.commentCount || 0})</Text>
                            <View style={styles.commentsDivider} />
                            <Text style={styles.commentsSortLabel}>SORT BY LATEST</Text>
                        </View>

                        {getChildComments(null).map((comment) => renderCommentThread(comment))}
                    </View>
                </ScrollView>

                {/* Reply banner */}
                {replyingTo && (
                    <View style={styles.replyBanner}>
                        <Text style={styles.replyBannerText}>
                            Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.name}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                            <MaterialIcons name="close" size={18} color={COLORS.outline} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Sticky Comment Bar */}
                <View
                    style={[
                        styles.commentBar,
                        {
                            paddingBottom:
                                12 +
                                (isKeyboardVisible
                                    ? 0
                                    : Platform.OS === 'ios'
                                        ? Math.max(insets.bottom, 0)
                                        : hasKeyboardInteracted
                                            ? 0
                                            : Math.max(insets.bottom, 0)),
                        },
                    ]}
                >
                    <TouchableOpacity style={styles.commentIconBtn} activeOpacity={0.8}>
                        <MaterialIcons name="mood" size={22} color={COLORS.outline} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.commentInput}
                        placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Add a comment..."}
                        placeholderTextColor={COLORS.onSurfaceVariant}
                        value={commentText}
                        onChangeText={setCommentText}
                        onFocus={() => {
                            setIsKeyboardVisible(true);
                            setHasKeyboardInteracted(true);
                        }}
                        onBlur={() => setIsKeyboardVisible(false)}
                    />
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSubmitComment}
                        disabled={submittingComment || !commentText.trim()}
                    >
                        <LinearGradient
                            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sendBtn}
                        >
                            <MaterialIcons name="send" size={22} color="#ffffff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Fullscreen Image Modal */}
                <Modal
                    visible={showImageModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowImageModal(false)}
                >
                    <View style={styles.modalBackground}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setShowImageModal(false)}
                        >
                            <MaterialIcons name="close" size={30} color="#fff" />
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Modal>

            </View>
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    },
    commentIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    mainCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginTop: 4,
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
        elevation: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typePill: {
        backgroundColor: '#fce4ec',
        borderRadius: 9999,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    typePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    subjectPill: {
        backgroundColor: '#f3e5f5',
        borderRadius: 9999,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    subjectPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    postTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.onSurface,
        lineHeight: 30,
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 16,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceContainerLow,
        borderWidth: 2,
        borderColor: '#f3e5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceContainerLow,
        borderWidth: 2,
        borderColor: '#f3e5f5',
    },
    authorName: {
        fontWeight: '700',
        fontSize: 13,
        color: COLORS.onSurface,
    },
    authorTimestamp: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.outline,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    bodyText: {
        fontSize: 14,
        color: 'rgba(52,44,56,0.9)',
        lineHeight: 22,
        marginBottom: 16,
    },
    attachmentSection: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceContainerLow,
    },
    attachedImage: {
        width: '100%',
        height: 250,
        borderRadius: 16,
    },
    expandHint: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        gap: 4,
    },
    expandHintText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    fileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.surfaceVariant,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.onSurface,
    },
    fileSize: {
        fontSize: 12,
        color: COLORS.outline,
        marginTop: 2,
    },
    pollCard: {
        backgroundColor: '#FDF7FF',
        borderRadius: 16,
        padding: 16,
        marginVertical: 16,
    },
    pollCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pollHeaderLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    pollVoteCount: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.outline,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    pollOptionBtn: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        overflow: 'hidden',
        height: 52,
        position: 'relative',
        marginBottom: 8,
        justifyContent: 'center',
    },
    pollOptionFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        borderRadius: 12,
    },
    pollOptionContent: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    pollOptionLabel: {
        fontWeight: '700',
        fontSize: 13,
        color: COLORS.onSurface,
    },
    pollOptionPercent: {
        fontWeight: '700',
        fontSize: 13,
        color: COLORS.onSurface,
    },
    pollFooterText: {
        fontSize: 10,
        fontStyle: 'italic',
        color: COLORS.outline,
        textAlign: 'center',
        marginTop: 4,
    },
    interactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceContainerLow,
        paddingTop: 14,
    },
    votePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: 9999,
        padding: 4,
        paddingHorizontal: 8,
        gap: 4,
    },
    voteCount: {
        fontWeight: '700',
        fontSize: 12,
        color: COLORS.onSurface,
        marginHorizontal: 4,
    },
    interactionRight: {
        flexDirection: 'row',
        gap: 8,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceContainerLow,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentsSection: {
        marginHorizontal: 16,
        marginTop: 20,
    },
    commentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    commentsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.onSurface,
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    },
    commentsDivider: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.surfaceVariant,
        marginHorizontal: 12,
    },
    commentsSortLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    commentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
        position: 'relative',
    },
    commentAvatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceContainerLow,
        borderWidth: 1,
        borderColor: COLORS.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentAvatarImg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceContainerLow,
    },
    commentNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commentName: {
        fontWeight: '700',
        fontSize: 12,
        color: COLORS.onSurface,
    },
    commentTime: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.outline,
        textTransform: 'uppercase',
    },
    commentText: {
        fontSize: 12,
        color: 'rgba(52,44,56,0.8)',
        lineHeight: 18,
        marginTop: 4,
    },
    deleteCommentBtn: {
        padding: 4,
    },
    replyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    replyBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.outline,
    },
    replyCard: {
        marginLeft: 32,
        backgroundColor: '#f9f0ff',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
        position: 'relative',
    },
    replyAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceContainerLow,
        borderWidth: 1,
        borderColor: COLORS.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyAvatarImg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceContainerLow,
    },
    replyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.surfaceContainerLow,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceVariant,
    },
    replyBannerText: {
        fontSize: 12,
        color: COLORS.onSurfaceVariant,
    },
    commentBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceVariant,
    },
    commentInput: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 9999,
        paddingHorizontal: 16,
        height: 44,
        fontSize: 13,
        color: COLORS.onSurface,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    // Dropdown Menu
    dropdownMenu: {
        position: 'absolute',
        top: 28,
        right: 0,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingVertical: 4,
        minWidth: 140,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 10,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.onSurface,
    },
});
