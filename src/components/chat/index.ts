// Chat Components - Layout
export { ChatContainer, type ChatContainerProps } from './ChatContainer'
export {
  Conversation,
  ConversationEmptyState,
  type ConversationProps,
  type ConversationEmptyStateProps,
} from './Conversation'
export { PromptInput, type PromptInputProps } from './PromptInput'

// Chat Components - Premium Input UX
export { SlashCommandMenu, type SlashCommandMenuProps } from './SlashCommandMenu'
export { createDefaultCommands, type SlashCommand } from './slashCommands'
export {
  SuggestionChips,
  CompactSuggestionChips,
  type SuggestionChip,
  type SuggestionChipsProps,
  type CompactSuggestionChipsProps,
} from './SuggestionChips'

// Chat Components - Streaming & Animation
export {
  StreamingText,
  TypewriterText,
  StreamingMarkdown,
  type StreamingTextProps,
  type TypewriterTextProps,
  type StreamingMarkdownProps,
} from './StreamingText'

// Chat Components - Artifacts
export {
  InlineArtifact,
  CompactArtifact,
  ArtifactBadge,
  type ArtifactType,
  type InlineArtifactProps,
  type CompactArtifactProps,
  type ArtifactBadgeProps,
} from './InlineArtifact'

// Chat Components - Messages
export {
  Message,
  MessageGroup,
  ThinkingIndicator,
  TypingIndicator,
  type MessageProps,
  type MessageRole,
  type MessageStatus,
  type MessageGroupProps,
  type ThinkingIndicatorProps,
  type TypingIndicatorProps,
} from './Message'
export { MessageContent, type MessageContentProps } from './MessageContent'
export { MessageActions, type MessageActionsProps } from './MessageActions'

// Chat Components - Tools & Actions
export { Tool, ToolList, type ToolProps, type ToolStatus, type ToolListProps } from './Tool'
export {
  Confirmation,
  InlineConfirmation,
  type ConfirmationProps,
  type InlineConfirmationProps,
} from './Confirmation'

// Chat Components - Progress & Reasoning
export {
  TaskProgress,
  CompactTaskProgress,
  StepProgress,
  type TaskProgressProps,
  type Task,
  type TaskStatus,
  type CompactTaskProgressProps,
  type Step,
  type StepProgressProps,
} from './TaskProgress'
export {
  Reasoning,
  ReasoningStep,
  InsightCard,
  type ReasoningProps,
  type ReasoningStepProps,
  type InsightCardProps,
} from './Reasoning'

// Chat Components - Citations
export {
  InlineCitation,
  CitationList,
  SourceBadge,
  type InlineCitationProps,
  type Citation,
  type CitationListProps,
  type SourceBadgeProps,
} from './InlineCitation'
