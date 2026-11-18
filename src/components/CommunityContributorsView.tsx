import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronRight,
  Crown,
  Lightbulb,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { CommunityContributionStats } from '../types/community.ts';
import { subscribeToLeaderboardStats } from '../utils/communityService.ts';
import {
  CONTRIBUTION_POINTS,
  DAILY_REPLY_REWARD_CAP,
  LeaderboardTimeframe,
  rankContributorsForLeaderboard,
} from '../utils/contributions.ts';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';

interface CommunityContributorsLeaderboardProps {
  isDark?: boolean;
  onSelectContributor?: (uid: string) => void;
  onOpenFeedbackModal?: () => void;
}

const TIMEFRAME_TABS: Array<{ id: LeaderboardTimeframe; label: string }> = [
  { id: 'all_time', label: 'All-Time' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
];

export const CommunityContributorsLeaderboard: React.FC<
  CommunityContributorsLeaderboardProps
> = ({ isDark = false, onSelectContributor, onOpenFeedbackModal }) => {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time');
  const [rawStats, setRawStats] = useState<CommunityContributionStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleLimit, setVisibleLimit] = useState(25);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToLeaderboardStats(150, (list) => {
      setRawStats(list);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const ranked = useMemo(
    () => rankContributorsForLeaderboard(rawStats, timeframe),
    [rawStats, timeframe]
  );

  const topThree = ranked.slice(0, 3);
  const displayedList = ranked.slice(0, visibleLimit);

  const podiumAccent = (rank: number) => {
    if (rank === 1) {
      return isDark
        ? 'border-[#FFF025]/55 bg-[#FFF025]/10'
        : 'border-amber-400 bg-amber-50';
    }
    if (rank === 2) {
      return isDark
        ? 'border-slate-400/45 bg-slate-400/10'
        : 'border-slate-300 bg-slate-50';
    }
    return isDark
      ? 'border-amber-700/50 bg-amber-800/10'
      : 'border-orange-300 bg-orange-50/70';
  };

  return (
    <div className="space-y-6">
      {/* Header & Timeframe Switch */}
      <div
        className={`rounded-2xl border-2 border-black p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
        }`}
      >
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#B11469]">
            <Trophy className="w-3.5 h-3.5" />
            <span>Builder Recognition</span>
          </div>
          <h2 className="font-chewy text-2xl sm:text-3xl">Community Contributors</h2>
          <p className={`text-xs sm:text-sm max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Recognizing builders who publish live creations, share thoughtful feedback with peers, and submit helpful ideas to improve Build Buds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="tablist"
            aria-label="Leaderboard timeframe"
            className={`inline-flex p-1 rounded-xl border ${
              isDark ? 'bg-[#0b0c10] border-white/15' : 'bg-slate-100 border-black/15'
            }`}
          >
            {TIMEFRAME_TABS.map((tab) => {
              const active = timeframe === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTimeframe(tab.id);
                    setVisibleLimit(25);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#FFF025] text-black shadow-sm'
                      : isDark
                        ? 'text-slate-300 hover:text-white'
                        : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {onOpenFeedbackModal && (
            <button
              type="button"
              onClick={onOpenFeedbackModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Suggest Feature</span>
            </button>
          )}
        </div>
      </div>

      {/* Scoring Transparency Strip */}
      <div
        className={`rounded-2xl border p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs ${
          isDark
            ? 'bg-[#121222] border-white/15 text-slate-200'
            : 'bg-slate-50 border-black/15 text-slate-700'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Rocket className="w-4 h-4 text-[#B11469] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">+{CONTRIBUTION_POINTS.showcase_published} pts · Approved Showcase</div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Published live creations only
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">+{CONTRIBUTION_POINTS.meaningful_reply} pts · Meaningful Reply</div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              20+ chars to peers (max {DAILY_REPLY_REWARD_CAP}/day)
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">+{CONTRIBUTION_POINTS.suggestion_submitted} pt · Valid Suggestion</div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Via Feedback Centre
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Award className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">+{CONTRIBUTION_POINTS.suggestion_approved} bonus · Useful Idea</div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Verified by moderators
            </div>
          </div>
        </div>
      </div>

      {/* Top-3 Subtle Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {topThree.map(({ stats, points, rank }) => {
            const avatarSrc = resolveBuilderAvatarUrl(stats.avatarUrl, stats.uid);
            return (
              <button
                key={stats.uid}
                type="button"
                onClick={() => onSelectContributor?.(stats.uid)}
                className={`text-left rounded-2xl border-2 p-4 transition-transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-3.5 ${podiumAccent(
                  rank
                )} ${isDark ? 'text-white' : 'text-black'}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarSrc}
                    alt={stats.displayName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-black"
                  />
                  <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-black text-[#FFF025] text-[11px] font-black flex items-center justify-center border border-white/20">
                    #{rank}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm truncate">{stats.displayName}</span>
                    {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </div>
                  <div className={`text-[11px] truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {stats.schoolName || 'Build Buds Creator'}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="font-black tabular-nums">{points} pts</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      · {stats.approvedCreationsCount} creations · {stats.meaningfulRepliesCount} replies
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Ranked Leaderboard Table */}
      <div
        className={`rounded-2xl border-2 border-black overflow-hidden ${
          isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
        }`}
      >
        <div
          className={`px-4 py-3 border-b flex items-center justify-between text-xs font-bold ${
            isDark ? 'border-white/10 bg-[#181a2c]' : 'border-black/10 bg-slate-50'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B11469]" />
            <span>
              {timeframe === 'all_time'
                ? 'All-Time Standings'
                : timeframe === 'monthly'
                  ? 'This Month (UTC)'
                  : 'This Week (UTC)'}
            </span>
          </span>
          <span className={`tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {ranked.length} contributor{ranked.length === 1 ? '' : 's'}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs opacity-65">Loading Community Contributors...</div>
        ) : displayedList.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-sm font-bold">No verified contributions recorded for this period yet.</p>
            <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Publish showcase creations, reply thoughtfully to fellow builders, or send helpful suggestions in the Feedback Centre to climb the board.
            </p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-100'}`}>
            {displayedList.map(({ stats, points, rank }) => {
              const avatarSrc = resolveBuilderAvatarUrl(stats.avatarUrl, stats.uid);
              return (
                <button
                  key={stats.uid}
                  type="button"
                  onClick={() => onSelectContributor?.(stats.uid)}
                  className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 text-center text-xs font-black tabular-nums shrink-0 ${
                        rank <= 3
                          ? 'text-[#B11469]'
                          : isDark
                            ? 'text-slate-400'
                            : 'text-slate-500'
                      }`}
                    >
                      #{rank}
                    </span>
                    <img
                      src={avatarSrc}
                      alt={stats.displayName}
                      className="w-9 h-9 rounded-full object-cover border border-black/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate flex items-center gap-1.5">
                        <span className="truncate">{stats.displayName}</span>
                        {(stats.role === 'admin' || stats.role === 'moderator') && (
                          <span className="px-1.5 py-0.2 rounded bg-black/15 dark:bg-white/10 text-[9px] font-bold uppercase">
                            {stats.role}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {stats.approvedCreationsCount} showcase{stats.approvedCreationsCount === 1 ? '' : 's'} ·{' '}
                        {stats.meaningfulRepliesCount} meaningful repl{stats.meaningfulRepliesCount === 1 ? 'y' : 'ies'} ·{' '}
                        {stats.suggestionsSubmittedCount} suggestion{stats.suggestionsSubmittedCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black tabular-nums">{points} pts</div>
                      {timeframe !== 'all_time' && (
                        <div className={`text-[10px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {stats.lifetimePoints} all-time
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {ranked.length > visibleLimit && (
          <div className="p-3 text-center border-t border-black/10">
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + 25)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              Show More ({ranked.length - visibleLimit} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface CommunityContributorsPreviewProps {
  isDark?: boolean;
  onViewFullLeaderboard: () => void;
  onSelectContributor?: (uid: string) => void;
}

export const CommunityContributorsPreview: React.FC<
  CommunityContributorsPreviewProps
> = ({ isDark = false, onViewFullLeaderboard, onSelectContributor }) => {
  const [rawStats, setRawStats] = useState<CommunityContributionStats[]>([]);

  useEffect(() => {
    const unsub = subscribeToLeaderboardStats(25, setRawStats);
    return () => unsub();
  }, []);

  const topFive = useMemo(
    () => rankContributorsForLeaderboard(rawStats, 'all_time').slice(0, 5),
    [rawStats]
  );

  return (
    <div
      className={`rounded-2xl border-2 border-black p-4 space-y-3 ${
        isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 text-[#B11469] shrink-0" />
          <h3 className="text-xs font-black uppercase tracking-wider truncate">
            Community Contributors
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewFullLeaderboard}
          className="text-[11px] font-bold text-[#B11469] hover:underline cursor-pointer shrink-0"
        >
          View All
        </button>
      </div>

      {topFive.length === 0 ? (
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Contribute replies, showcases, and ideas to appear on the leaderboard.
        </p>
      ) : (
        <div className="space-y-2">
          {topFive.map(({ stats, points, rank }) => (
            <button
              key={stats.uid}
              type="button"
              onClick={() => onSelectContributor?.(stats.uid)}
              className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#18192c] border-white/10 hover:border-white/25'
                  : 'bg-slate-50 border-black/10 hover:border-black/25'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-black w-5 text-center text-[#B11469] shrink-0">
                  #{rank}
                </span>
                <img
                  src={resolveBuilderAvatarUrl(stats.avatarUrl, stats.uid)}
                  alt={stats.displayName}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
                <span className="text-xs font-bold truncate">{stats.displayName}</span>
              </div>
              <span className="text-[11px] font-black tabular-nums shrink-0">
                {points} pts
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
