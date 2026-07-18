// 「要復習」の個別ブックマーク機能。間隔反復(SRS)によるミス管理とは独立した、ユーザーが手動で付け外しする印。

export const BOOKMARKS_STORAGE_KEY = "bookmarkedQuestionIds";

export const toggleBookmark = (bookmarkedIds, questionId) => (
  bookmarkedIds.includes(questionId)
    ? bookmarkedIds.filter((id) => id !== questionId)
    : [...bookmarkedIds, questionId]
);
