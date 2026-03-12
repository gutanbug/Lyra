import React from 'react';
import {
  Home,
  LayoutDashboard,
  Kanban,
  ListTodo,
  FileText,
  GitBranch,
  GitPullRequest,
  GitMerge,
  Code,
  BookOpen,
  Search,
  Bell,
  Settings,
  Users,
  Filter,
  BarChart3,
  Calendar,
  Target,
  CheckSquare,
  Bug,
  Zap,
  Flag,
  Tag,
  Layers,
  Folder,
  FolderTree,
  Archive,
  Clock,
  Star,
  Plus,
  Download,
  Upload,
  Share2,
  MessageSquare,
  AtSign,
  Link2,
  Trash2,
  Edit,
  Eye,
  Lock,
  Unlock,
  LucideIcon,
} from "lucide-react";

export interface IconProps {
  className?: string;
  size?: number;
}

// 대시보드 & 홈
export const HomeIcon = ({ className, size = 20 }: IconProps) => (
  <Home className={className} size={size} />
);

export const DashboardIcon = ({ className, size = 20 }: IconProps) => (
  <LayoutDashboard className={className} size={size} />
);

// 프로젝트 관리
export const BoardIcon = ({ className, size = 20 }: IconProps) => (
  <Kanban className={className} size={size} />
);

export const BacklogIcon = ({ className, size = 20 }: IconProps) => (
  <ListTodo className={className} size={size} />
);

export const SprintIcon = ({ className, size = 20 }: IconProps) => (
  <Zap className={className} size={size} />
);

export const RoadmapIcon = ({ className, size = 20 }: IconProps) => (
  <Target className={className} size={size} />
);

// 이슈 & 태스크
export const IssueIcon = ({ className, size = 20 }: IconProps) => (
  <CheckSquare className={className} size={size} />
);

export const BugIcon = ({ className, size = 20 }: IconProps) => (
  <Bug className={className} size={size} />
);

export const TaskIcon = ({ className, size = 20 }: IconProps) => (
  <CheckSquare className={className} size={size} />
);

// 코드 & 리포지토리
export const RepositoryIcon = ({ className, size = 20 }: IconProps) => (
  <Code className={className} size={size} />
);

export const BranchIcon = ({ className, size = 20 }: IconProps) => (
  <GitBranch className={className} size={size} />
);

export const PullRequestIcon = ({ className, size = 20 }: IconProps) => (
  <GitPullRequest className={className} size={size} />
);

export const MergeRequestIcon = ({ className, size = 20 }: IconProps) => (
  <GitMerge className={className} size={size} />
);

// 문서 & 위키
export const WikiIcon = ({ className, size = 20 }: IconProps) => (
  <BookOpen className={className} size={size} />
);

export const PageIcon = ({ className, size = 20 }: IconProps) => (
  <FileText className={className} size={size} />
);

export const DocumentIcon = ({ className, size = 20 }: IconProps) => (
  <FileText className={className} size={size} />
);

// 유틸리티
export const SearchIcon = ({ className, size = 20 }: IconProps) => (
  <Search className={className} size={size} />
);

export const NotificationIcon = ({ className, size = 20 }: IconProps) => (
  <Bell className={className} size={size} />
);

export const SettingsIcon = ({ className, size = 20 }: IconProps) => (
  <Settings className={className} size={size} />
);

export const TeamIcon = ({ className, size = 20 }: IconProps) => (
  <Users className={className} size={size} />
);

export const FilterIcon = ({ className, size = 20 }: IconProps) => (
  <Filter className={className} size={size} />
);

export const ReportIcon = ({ className, size = 20 }: IconProps) => (
  <BarChart3 className={className} size={size} />
);

export const CalendarIcon = ({ className, size = 20 }: IconProps) => (
  <Calendar className={className} size={size} />
);

// 조직 & 분류
export const ProjectIcon = ({ className, size = 20 }: IconProps) => (
  <Folder className={className} size={size} />
);

export const FolderIcon = ({ className, size = 20 }: IconProps) => (
  <FolderTree className={className} size={size} />
);

export const LabelIcon = ({ className, size = 20 }: IconProps) => (
  <Tag className={className} size={size} />
);

export const MilestoneIcon = ({ className, size = 20 }: IconProps) => (
  <Flag className={className} size={size} />
);

export const LayersIcon = ({ className, size = 20 }: IconProps) => (
  <Layers className={className} size={size} />
);

// 액션
export const ArchiveIcon = ({ className, size = 20 }: IconProps) => (
  <Archive className={className} size={size} />
);

export const HistoryIcon = ({ className, size = 20 }: IconProps) => (
  <Clock className={className} size={size} />
);

export const StarIcon = ({ className, size = 20 }: IconProps) => (
  <Star className={className} size={size} />
);

export const CreateIcon = ({ className, size = 20 }: IconProps) => (
  <Plus className={className} size={size} />
);

export const DownloadIcon = ({ className, size = 20 }: IconProps) => (
  <Download className={className} size={size} />
);

export const UploadIcon = ({ className, size = 20 }: IconProps) => (
  <Upload className={className} size={size} />
);

export const ShareIcon = ({ className, size = 20 }: IconProps) => (
  <Share2 className={className} size={size} />
);

// 커뮤니케이션
export const CommentIcon = ({ className, size = 20 }: IconProps) => (
  <MessageSquare className={className} size={size} />
);

export const MentionIcon = ({ className, size = 20 }: IconProps) => (
  <AtSign className={className} size={size} />
);

export const LinkIcon = ({ className, size = 20 }: IconProps) => (
  <Link2 className={className} size={size} />
);

// 편집 & 관리
export const DeleteIcon = ({ className, size = 20 }: IconProps) => (
  <Trash2 className={className} size={size} />
);

export const EditIcon = ({ className, size = 20 }: IconProps) => (
  <Edit className={className} size={size} />
);

export const ViewIcon = ({ className, size = 20 }: IconProps) => (
  <Eye className={className} size={size} />
);

export const LockIcon = ({ className, size = 20 }: IconProps) => (
  <Lock className={className} size={size} />
);

export const UnlockIcon = ({ className, size = 20 }: IconProps) => (
  <Unlock className={className} size={size} />
);

// 아이콘 카테고리별 그룹화
export const iconCategories = {
  navigation: {
    title: "네비게이션",
    icons: [
      { name: "Home", component: HomeIcon, description: "홈" },
      { name: "Dashboard", component: DashboardIcon, description: "대시보드" },
      { name: "Search", component: SearchIcon, description: "검색" },
      { name: "Notification", component: NotificationIcon, description: "알림" },
      { name: "Settings", component: SettingsIcon, description: "설정" },
    ],
  },
  projectManagement: {
    title: "프로젝트 관리",
    icons: [
      { name: "Board", component: BoardIcon, description: "보드/칸반" },
      { name: "Backlog", component: BacklogIcon, description: "백로그" },
      { name: "Sprint", component: SprintIcon, description: "스프린트" },
      { name: "Roadmap", component: RoadmapIcon, description: "로드맵" },
      { name: "Project", component: ProjectIcon, description: "프로젝트" },
    ],
  },
  issuesAndTasks: {
    title: "이슈 & 태스크",
    icons: [
      { name: "Issue", component: IssueIcon, description: "이슈" },
      { name: "Task", component: TaskIcon, description: "태스크" },
      { name: "Bug", component: BugIcon, description: "버그" },
      { name: "Milestone", component: MilestoneIcon, description: "마일스톤" },
    ],
  },
  codeAndRepo: {
    title: "코드 & 리포지토리",
    icons: [
      { name: "Repository", component: RepositoryIcon, description: "리포지토리" },
      { name: "Branch", component: BranchIcon, description: "브랜치" },
      { name: "PullRequest", component: PullRequestIcon, description: "Pull Request" },
      { name: "MergeRequest", component: MergeRequestIcon, description: "Merge Request" },
    ],
  },
  documentation: {
    title: "문서",
    icons: [
      { name: "Wiki", component: WikiIcon, description: "위키" },
      { name: "Page", component: PageIcon, description: "페이지" },
      { name: "Document", component: DocumentIcon, description: "문서" },
    ],
  },
  organization: {
    title: "조직 & 분류",
    icons: [
      { name: "Team", component: TeamIcon, description: "팀" },
      { name: "Folder", component: FolderIcon, description: "폴더" },
      { name: "Label", component: LabelIcon, description: "레이블" },
      { name: "Layers", component: LayersIcon, description: "레이어" },
    ],
  },
  analytics: {
    title: "분석 & 리포트",
    icons: [
      { name: "Report", component: ReportIcon, description: "리포트" },
      { name: "Calendar", component: CalendarIcon, description: "캘린더" },
      { name: "Filter", component: FilterIcon, description: "필터" },
    ],
  },
  actions: {
    title: "액션",
    icons: [
      { name: "Create", component: CreateIcon, description: "생성" },
      { name: "Edit", component: EditIcon, description: "편집" },
      { name: "Delete", component: DeleteIcon, description: "삭제" },
      { name: "View", component: ViewIcon, description: "보기" },
      { name: "Archive", component: ArchiveIcon, description: "아카이브" },
      { name: "Star", component: StarIcon, description: "즐겨찾기" },
      { name: "Share", component: ShareIcon, description: "공유" },
      { name: "Download", component: DownloadIcon, description: "다운로드" },
      { name: "Upload", component: UploadIcon, description: "업로드" },
    ],
  },
  communication: {
    title: "커뮤니케이션",
    icons: [
      { name: "Comment", component: CommentIcon, description: "댓글" },
      { name: "Mention", component: MentionIcon, description: "멘션" },
      { name: "Link", component: LinkIcon, description: "링크" },
    ],
  },
  security: {
    title: "보안",
    icons: [
      { name: "Lock", component: LockIcon, description: "잠금" },
      { name: "Unlock", component: UnlockIcon, description: "잠금 해제" },
    ],
  },
};
