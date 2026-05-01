import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Platform,
    Alert,
    Image,
    Linking,
    Modal,
    Animated,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { communityService } from '@/services/communityService';
import { Post } from '@/services/communityTypes';

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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FILTER_OPTIONS = ['All', 'Trending', 'Questions', 'Materials', 'Polls', 'Discussion', 'My Posts'];

const TYPE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
    question: { bg: 'rgba(255,141,178,0.2)', text: '#9f345d' },
    discussion: { bg: 'rgba(252,188,255,0.3)', text: '#9720ab' },
    poll: { bg: 'rgba(183,0,77,0.15)', text: '#b7004d' },
    material: { bg: '#c8e6c9', text: '#2e7d32' },
};

function getTimeAgo(dateString?: string): string {
    if (!dateString) return '';

    const now = Date.now();
    const date = new Date(dateString).getTime();

    if (isNaN(date)) return '';

    const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));

    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function CommunityFeedScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
    const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());
    const [pendingAction, setPendingAction] = useState<{
        type: 'hide' | 'delete';
        post: Post;
        timer: ReturnType<typeof setTimeout>;
    } | null>(null);
    const snackbarOpacity = useRef(new Animated.Value(0)).current;
    const fabOffset = useRef(new Animated.Value(0)).current;

    // Modal-based dropdown state
    const [menuPost, setMenuPost] = useState<Post | null>(null);

    const loadPosts = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);

            const filterType =
                activeFilter === 'All' || activeFilter === 'My Posts' || activeFilter === 'Trending'
                    ? undefined
                    : activeFilter === 'Questions' ? 'question'
                        : activeFilter === 'Materials' ? 'material'
                            : activeFilter === 'Polls' ? 'poll'
                                : activeFilter === 'Discussion' ? 'discussion'
                                    : undefined;

            const isMine = activeFilter === 'My Posts';
            const sortMode = activeFilter === 'Trending' ? 'trending' : undefined;

            const data = await communityService.getPosts({
                type: filterType,
                search: searchQuery || undefined,
                mine: isMine,
                sort: sortMode,
            });
            setPosts(data);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter, searchQuery]);

    useFocusEffect(
        useCallback(() => {
            loadPosts();
        }, [loadPosts])
    );

    const filteredPosts = useMemo(() => {
        return posts.filter(p => !hiddenPosts.has(p._id));
    }, [posts, hiddenPosts]);

    const onRefresh = useCallback(() => {
        loadPosts(true);
    }, [loadPosts]);

    const toggleBookmark = (postId: string) => {
        setBookmarked((prev) => {
            const next = new Set(prev);
            if (next.has(postId)) next.delete(postId);
            else next.add(postId);
            return next;
        });
    };

    const handleBookmarkPress = (post: Post) => {
        toggleBookmark(post._id);
        const attachmentUrl = post.fileURL ? communityService.getFileUrl(post.fileURL) : '';
        router.push({
            pathname: '/study-space/save-to-my-space',
            params: {
                title: post.title || 'Saved Community Post',
                content: post.content || '',
                authorName: post.user?.fullName || 'Community Member',
                authorAvatar: post.user?.profilePicture ? communityService.getFileUrl(post.user.profilePicture) : '',
                attachmentUrl,
                pollData: post.type === 'poll' ? JSON.stringify(post.pollOptions) : undefined,
            },
        } as any);
    };

    const handleVote = async (postId: string, type: 'upvote' | 'downvote') => {
        // Subtle pop feel
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);

        // Optimistic update — instant UI feedback
        setPosts((prev) =>
            prev.map((p) => {
                if (p._id !== postId) return p;
                const wasVoted = p.userVote === type;
                const wasSwitched = p.userVote && p.userVote !== type;
                return {
                    ...p,
                    upvotes: type === 'upvote'
                        ? (wasVoted ? p.upvotes - 1 : p.upvotes + 1)
                        : (wasSwitched && p.userVote === 'upvote' ? p.upvotes - 1 : p.upvotes),
                    downvotes: type === 'downvote'
                        ? (wasVoted ? p.downvotes - 1 : p.downvotes + 1)
                        : (wasSwitched && p.userVote === 'downvote' ? p.downvotes - 1 : p.downvotes),
                    userVote: wasVoted ? null : type,
                } as Post;
            })
        );
        // Background sync — silently correct if needed
        try {
            const result = await communityService.votePost(postId, type);
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === postId
                        ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes, userVote: result.userVote as any }
                        : p
                )
            );
        } catch (error) {
            console.error('Error voting:', error);
            // Reload on error to get correct state
            loadPosts(true);
        }
    };

    const handlePollVote = async (postId: string, optionIndex: number) => {
        try {
            const result = await communityService.votePoll(postId, optionIndex);
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === postId
                        ? { ...p, pollOptions: result.pollOptions, userPollVote: result.userPollVote } as Post
                        : p
                )
            );
        } catch (error) {
            console.error('Error poll voting:', error);
        }
    };

    const showSnackbarAction = (type: 'hide' | 'delete', post: Post) => {
        setMenuPost(null);

        // Cancel any existing pending action
        if (pendingAction) {
            clearTimeout(pendingAction.timer);
            // Execute the previous action immediately if it was a delete
            if (pendingAction.type === 'delete') {
                communityService.deletePost(pendingAction.post._id).catch(console.error);
            }
        }

        // Immediately hide from feed
        setHiddenPosts(prev => new Set(prev).add(post._id));

        // Show snackbar
        Animated.parallel([
            Animated.timing(snackbarOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(fabOffset, { toValue: 70, duration: 200, useNativeDriver: true })
        ]).start();

        // Set timer — when it expires, finalize the action
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(snackbarOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(fabOffset, { toValue: 0, duration: 200, useNativeDriver: true })
            ]).start();
            if (type === 'delete') {
                communityService.deletePost(post._id)
                    .then(() => setPosts(prev => prev.filter(p => p._id !== post._id)))
                    .catch(console.error);
            }
            setPendingAction(null);
        }, 5000);

        setPendingAction({ type, post, timer });
    };

    const handleDeletePost = (post: Post) => showSnackbarAction('delete', post);
    const hidePost = (postId: string) => {
        const post = posts.find(p => p._id === postId);
        if (post) showSnackbarAction('hide', post);
    };

    const undoAction = () => {
        if (!pendingAction) return;
        clearTimeout(pendingAction.timer);
        // Restore post visibility
        setHiddenPosts(prev => {
            const next = new Set(prev);
            next.delete(pendingAction.post._id);
            return next;
        });
        Animated.parallel([
            Animated.timing(snackbarOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fabOffset, { toValue: 0, duration: 200, useNativeDriver: true })
        ]).start();
        setPendingAction(null);
    };

    const navigateToPost = (postId: string) => {
        router.push({ pathname: '/public-community/post-detail', params: { postId } } as any);
    };

    const handleEditPost = (post: Post) => {
        setMenuPost(null);
        setTimeout(() => {
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
        }, 100);
    };

    const renderPostCard = ({ item }: { item: Post }) => {
        const badge = TYPE_BADGE_STYLES[item.type] || TYPE_BADGE_STYLES.question;
        const totalVotes = item.upvotes - item.downvotes;
        const imageUrl = item.fileURL ? communityService.getFileUrl(item.fileURL) : null;
        const isImage = item.fileURL ? /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileURL) : false;

        return (
            <View style={styles.postCard}>
                {/* Row 1: Type badge + menu button */}
                <View style={styles.cardRow1}>
                    <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                            {item.type.toUpperCase()}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setMenuPost(item)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.menuButton}
                    >
                        <MaterialIcons name="more-vert" size={22} color={COLORS.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>

                {/* Tappable title + body area */}
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigateToPost(item._id)}>
                    <Text style={styles.postTitle}>{item.title}</Text>
                    {item.content ? (
                        <Text style={styles.postDescription} numberOfLines={3}>
                            {item.content}
                        </Text>
                    ) : null}
                </TouchableOpacity>

                {/* Attachment Preview — outside Pressable so it doesn't nav */}
                {imageUrl && isImage ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => WebBrowser.openBrowserAsync(imageUrl)}
                        style={styles.attachmentImageWrap}
                    >
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.attachmentImage}
                            resizeMode="cover"
                        />
                        <View style={styles.attachmentImageHint}>
                            <MaterialIcons name="open-in-new" size={12} color="#fff" />
                            <Text style={styles.attachmentImageHintText}>View image</Text>
                        </View>
                    </TouchableOpacity>
                ) : imageUrl ? (
                    <TouchableOpacity
                        style={styles.attachmentFile}
                        onPress={() => WebBrowser.openBrowserAsync(imageUrl)}
                    >
                        <MaterialIcons name="insert-drive-file" size={20} color={COLORS.secondary} />
                        <Text style={styles.attachmentText}>View attachment</Text>
                        <MaterialIcons name="download" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                ) : null}


                {/* Subject */}
                {item.subject ? (
                    <Text style={styles.subjectTag}>#{item.subject}</Text>
                ) : null}

                {/* Poll preview */}
                {item.type === 'poll' && item.pollOptions?.length > 0 && (
                    <View style={styles.pollPreview}>
                        {item.pollOptions.map((opt, idx) => {
                            const totalPollVotes = item.pollOptions.reduce((sum, o) => sum + o.voteCount, 0);
                            const percent = totalPollVotes > 0 ? Math.round((opt.voteCount / totalPollVotes) * 100) : 0;
                            const hasVoted = item.userPollVote === idx;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.pollOptionRow}
                                    onPress={() => handlePollVote(item._id, idx)}
                                >
                                    <View style={[styles.pollOptionFill, { width: `${percent}%` as any }, hasVoted && { backgroundColor: 'rgba(151,32,171,0.4)' }]} />
                                    <View style={styles.pollOptionTextRow}>
                                        <View style={styles.pollLabelWrap}>
                                            <Text style={[styles.pollOptionLabel, hasVoted && { color: COLORS.primary }]}>{opt.optionText}</Text>
                                            {hasVoted && <MaterialIcons name="check-circle" size={14} color={COLORS.primary} />}
                                        </View>
                                        <Text style={styles.pollOptionPercent}>{percent}%</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Author row */}
                <View style={styles.authorRow}>
                    {item.user?.profilePicture ? (
                        <Image
                            source={{ uri: communityService.getFileUrl(item.user.profilePicture) }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={styles.avatarCircle}>
                            <MaterialIcons name="person" size={20} color={COLORS.onSurfaceVariant} />
                        </View>
                    )}
                    <View>
                        <Text style={styles.authorName}>{item.user?.fullName || 'Unknown'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.timestamp}>{getTimeAgo(item.createdAt)}</Text>
                            {item.updatedAt && item.updatedAt !== item.createdAt && (
                                <Text style={styles.editedLabel}>• edited</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Footer: vote + comments + bookmark */}
                <View style={styles.cardFooter}>
                    <View style={styles.votePill}>
                        <TouchableOpacity
                            onPress={() => handleVote(item._id, 'upvote')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaterialIcons
                                name="arrow-upward"
                                size={18}
                                color={item.userVote === 'upvote' ? COLORS.primary : COLORS.outline}
                            />
                        </TouchableOpacity>
                        <Text style={styles.voteCount}>{totalVotes}</Text>
                        <TouchableOpacity
                            onPress={() => handleVote(item._id, 'downvote')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaterialIcons
                                name="arrow-downward"
                                size={18}
                                color={item.userVote === 'downvote' ? COLORS.primary : COLORS.outline}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.footerRight}>
                        <TouchableOpacity style={styles.commentBtn} onPress={() => navigateToPost(item._id)}>
                            <MaterialCommunityIcons name="comment-outline" size={18} color={COLORS.onSurfaceVariant} />
                            <Text style={styles.commentCount}>{item.commentCount || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleBookmarkPress(item)}>
                            <MaterialIcons
                                name={bookmarked.has(item._id) ? 'bookmark' : 'bookmark-border'}
                                size={22}
                                color={bookmarked.has(item._id) ? COLORS.secondary : COLORS.onSurfaceVariant}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Community</Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={20} color={COLORS.onSurfaceVariant} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search community..."
                        placeholderTextColor={COLORS.onSurfaceVariant}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialIcons name="close" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChips}
                style={styles.filterChipsRow}
            >
                {FILTER_OPTIONS.map((filter) => {
                    const isActive = activeFilter === filter;
                    return (
                        <TouchableOpacity
                            key={filter}
                            activeOpacity={0.7}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setActiveFilter(filter);
                            }}
                        >
                            {isActive ? (
                                <LinearGradient
                                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.chipActive}
                                >
                                    <Text style={styles.chipActiveText}>{filter}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={styles.chipInactive}>
                                    <Text style={styles.chipInactiveText}>{filter}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Posts List */}
            <View style={styles.contentArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading posts...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredPosts}
                        keyExtractor={(item) => item._id}
                        renderItem={renderPostCard}
                        contentContainerStyle={styles.postList}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="forum-outline" size={60} color={COLORS.outline} />
                                <Text style={styles.emptyText}>No posts yet</Text>
                                <Text style={styles.emptySubtext}>Be the first to start a discussion!</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* FAB */}
            <Animated.View style={[styles.fab, { transform: [{ translateY: fabOffset.interpolate({ inputRange: [0, 70], outputRange: [0, -70] }) }] }]}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/public-community/create-post' as any)}
                >
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.fabGradient}
                    >
                        <MaterialIcons name="add" size={28} color="#ffffff" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Undo Snackbar */}
            <Animated.View
                style={[styles.snackbar, { opacity: snackbarOpacity }]}
                pointerEvents={pendingAction ? 'auto' : 'none'}
            >
                <Text style={styles.snackbarText}>
                    {pendingAction?.type === 'delete' ? 'Post deleted' : 'Post hidden'}
                </Text>
                <TouchableOpacity onPress={undoAction}>
                    <Text style={styles.snackbarUndo}>UNDO</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Dropdown Action Sheet Modal */}
            <Modal
                visible={menuPost !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuPost(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuPost(null)}
                >
                    <View style={styles.actionSheet}>
                        <View style={styles.actionSheetHandle} />
                        {menuPost?.isOwn && (
                            <TouchableOpacity
                                style={styles.actionSheetItem}
                                onPress={() => handleEditPost(menuPost!)}
                            >
                                <MaterialIcons name="edit" size={22} color={COLORS.primary} />
                                <Text style={[styles.actionSheetText, { color: COLORS.primary }]}>Edit Post</Text>
                            </TouchableOpacity>
                        )}
                        {menuPost?.isOwn && (
                            <TouchableOpacity
                                style={styles.actionSheetItem}
                                onPress={() => handleDeletePost(menuPost!)}
                            >
                                <MaterialIcons name="delete-outline" size={22} color={COLORS.error} />
                                <Text style={[styles.actionSheetText, { color: COLORS.error }]}>Delete Post</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.actionSheetItem}
                            onPress={() => hidePost(menuPost!._id)}
                        >
                            <MaterialIcons name="visibility-off" size={22} color={COLORS.onSurfaceVariant} />
                            <Text style={styles.actionSheetText}>Hide Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionSheetItem, styles.actionSheetCancel]}
                            onPress={() => setMenuPost(null)}
                        >
                            <Text style={styles.actionSheetCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
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
        backgroundColor: 'rgba(255,243,255,0.8)',
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
    searchBarContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        height: 46,
        paddingHorizontal: 18,
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
        elevation: 4,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.onSurface,
    },
    filterChipsRow: {
        flexGrow: 0,
        flexShrink: 0,
        marginBottom: 8,
    },
    filterChips: {
        paddingHorizontal: 16,
        gap: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipActive: {
        alignSelf: 'flex-start',
        borderRadius: 9999,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    chipActiveText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
    },
    chipInactive: {
        backgroundColor: '#f8f0ff',
        borderRadius: 9999,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    chipInactiveText: {
        color: COLORS.onSurfaceVariant,
        fontWeight: '600',
        fontSize: 13,
    },
    contentArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.outline,
        fontWeight: '500',
    },
    postList: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        gap: 16,
    },
    postCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
        elevation: 4,
    },
    cardRow1: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    typeBadge: {
        borderRadius: 9999,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    menuButton: {
        padding: 4,
    },
    postTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.onSurface,
        lineHeight: 26,
        marginBottom: 4,
    },
    postDescription: {
        fontSize: 14,
        color: COLORS.onSurfaceVariant,
        lineHeight: 20,
        marginBottom: 10,
    },
    attachmentImageWrap: {
        marginTop: 8,
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    attachmentImage: {
        width: '100%',
        height: 180,
        backgroundColor: COLORS.surfaceContainerLow,
    },
    attachmentImageHint: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    attachmentImageHintText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    attachmentFile: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: 10,
        marginTop: 8,
        marginBottom: 8,
    },
    attachmentText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.onSurfaceVariant,
    },
    subjectTag: {
        color: COLORS.secondary,
        fontWeight: '600',
        fontSize: 13,
        marginBottom: 10,
    },
    pollPreview: {
        marginBottom: 12,
        gap: 6,
    },
    pollOptionRow: {
        position: 'relative',
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceContainerLow,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    pollOptionFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        backgroundColor: 'rgba(151,32,171,0.2)',
        borderRadius: 12,
    },
    pollOptionTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    pollLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceContainerLow,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceContainerLow,
    },
    authorName: {
        fontWeight: '700',
        fontSize: 13,
        color: COLORS.onSurface,
    },
    timestamp: {
        fontStyle: 'italic',
        fontSize: 11,
        color: COLORS.outline,
    },
    editedLabel: {
        fontSize: 10,
        fontStyle: 'italic',
        color: COLORS.outline,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceContainerLow,
        paddingTop: 12,
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
        fontSize: 13,
        color: COLORS.onSurface,
        marginHorizontal: 4,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    commentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentCount: {
        fontSize: 13,
        color: COLORS.onSurfaceVariant,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 10,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceContainerLow,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.onSurface,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.outline,
    },
    snackbar: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        backgroundColor: '#342c38',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 8,
    },
    snackbarText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    snackbarUndo: {
        color: '#ce93d8',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Action Sheet Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
        paddingTop: 12,
    },
    actionSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.outline,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
        opacity: 0.4,
    },
    actionSheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    actionSheetText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.onSurface,
    },
    actionSheetCancel: {
        justifyContent: 'center',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceContainerLow,
    },
    actionSheetCancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.outline,
        textAlign: 'center',
    },
});
