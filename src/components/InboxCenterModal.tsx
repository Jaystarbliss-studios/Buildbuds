import React, { useMemo, useState } from 'react';
import {
  X,
  Bell,
  AtSign,
  Users,
  ShieldCheck,
  CheckCheck,
  MessageSquare,
  Heart,
  ExternalLink,
  Inbox,
  Flag,
} from 'lucide-react';
import { UserNotificationItem } from '../types/community.ts';
import { useTheme } from '../utils/themeContext.tsx';

export type InboxFilterTab = 'all' | 'mentions' | 'following' | 'moderation';

interface InboxCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: UserNotificationItem[];
  onSelectNotification: (notif: UserNotificationItem) => void;
  onMarkAllRead: () => void;
  isModeratorOrAdmin?: boolean;
}

function formatNotifTimestamp(iso: string): string {
  try {
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return '';
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const InboxCenterModal: React.FC<InboxCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectNotification,
  onMarkAllRead,
  isModeratorOrAdmin = false,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<InboxFilterTab>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'mentions':
        return notifications.filter((n) => n.type === 'mention');
      case 'following':
        return notifications.filter(
          (n) => n.type === 'followed_creator_post' || n.type === 'new_follower'
        );
      case 'moderation':
        return notifications.filter(
          (n) =>
            n.type === 'post_pending_review' ||
            n.type === 'post_moderated' ||
            n.type === 'moderation_report' ||
            n.type.startsWith('student_access_') ||
            n.type.startsWith('curation_')
        );
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  if (!isOpen) return null;

  const mentionUnread = notifications.filter((n) => !n.read && n.type === 'mention').length;
  const followUnread = notifications.filter(
    (n) => !n.read && (n.type === 'followed_creator_post' || n.type === 'new_follower')
  ).length;
  const modUnread = notifications.filter(
    (n) =>
      !n.read &&
      (n.type === 'post_pending_review' ||
        n.type === 'post_moderated' ||
        n.type === 'moderation_report' ||
        n.type.startsWith('student_access_'))
  ).length;

  const getIconForType = (type: UserNotificationItem['type']) => {
    if (type === 'mention') return <AtSign className="w-4 h-4 text-[#FFF025]" />;
    if (type === 'followed_creator_post' || type === 'new_follower')
      return <Users className="w-4 h-4 text-sky-400" />;
    if (type === 'moderation_report') return <Flag className="w-4 h-4 text-rose-400" />;
    if (type === 'post_pending_review' || type === 'post_moderated')
      return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    if (type === 'post_reaction') return <Heart className="w-4 h-4 text-rose-400" />;
    if (type === 'post_comment' || type === 'hub_message')
      return <MessageSquare className="w-4 h-4 text-amber-400" />;
    return <Bell className="w-4 h-4 text-[#B11469]" />;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-center-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border-3 border-black flex flex-col max-h-[85dvh] ${
          isDark ? 'bg-[#12131f] text-white' : 'bg-white text-black brand-shadow'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b-2 border-black flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#191b2b]' : 'bg-[#FFFDF5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF025] text-black border-2 border-black flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 id="inbox-center-title" className="text-base sm:text-lg font-black tracking-tight">
                Inbox Center
              </h2>
              <p className={`text-[11px] font-semibold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                {unreadCount > 0
                  ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'} across channels & posts`
                  : 'All caught up across mentions, creators, and reviews'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-white/15 bg-white/10 hover:bg-white/15 text-white'
                    : 'border-black/20 bg-slate-100 hover:bg-slate-200 text-black'
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Inbox Center"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-white/75' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          className={`px-4 py-2.5 border-b flex items-center gap-1.5 overflow-x-auto ${
            isDark ? 'border-white/10 bg-[#0e0f18]' : 'border-black/10 bg-slate-50'
          }`}
        >
          {(
            [
              { id: 'all', label: 'All', count: unreadCount },
              { id: 'mentions', label: '@Mentions', count: mentionUnread },
              { id: 'following', label: 'Creators & Follows', count: followUnread },
              {
                id: 'moderation',
                label: isModeratorOrAdmin ? 'Moderation Queue' : 'Post Status',
                count: modUnread,
              },
            ] as Array<{ id: InboxFilterTab; label: string; count: number }>
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? 'bg-[#FFF025] text-black border-2 border-black'
                    : isDark
                    ? 'bg-white/5 hover:bg-white/10 text-white/75 border border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-black/15'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                      active ? 'bg-black text-[#FFF025]' : 'bg-[#B11469] text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/10 dark:divide-white/10">
          {filteredNotifications.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF025]/15 border border-[#FFF025]/40 flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#C15D00]" />
              </div>
              <div className="text-sm font-black">No notifications in this tab yet</div>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                When someone @tags you in any channel or post, or a creator you follow publishes a new build, it will appear right here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onSelectNotification(n);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                  !n.read
                    ? isDark
                      ? 'bg-[#FFF025]/[0.08] hover:bg-[#FFF025]/[0.14]'
                      : 'bg-[#FFF025]/25 hover:bg-[#FFF025]/40'
                    : isDark
                    ? 'hover:bg-white/[0.04]'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border ${
                    isDark ? 'bg-[#1c1e2e] border-white/15' : 'bg-white border-black/15'
                  }`}
                >
                  {getIconForType(n.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black leading-snug">{n.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-semibold whitespace-nowrap ${
                          isDark ? 'text-white/45' : 'text-slate-500'
                        }`}
                      >
                        {formatNotifTimestamp(n.createdAt)}
                      </span>
                      {!n.read && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#B11469] shrink-0"
                          title="Unread"
                        />
                      )}
                    </div>
                  </div>

                  {n.message && (
                    <p
                      className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                        isDark ? 'text-white/75' : 'text-slate-700'
                      }`}
                    >
                      {n.message}
                    </p>
                  )}

                  {n.actionLabel && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#B11469] dark:text-[#FFF025]">
                      <span>{n.actionLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
