<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, unref, watch } from 'vue'
import type { PostItem } from '@/stores/posts'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import { getAdminMedia } from '@/api/generated/admin-media/admin-media'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, InputInstance } from 'element-plus'

const props = defineProps<{
  isOpen: boolean
  post: PostItem | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', post: Partial<PostItem>): void
}>()

const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()

const isAdminLike = computed(
  () => authStore.userRole === 'admin' || authStore.userRole === 'super_admin',
)

const formData = reactive<Partial<PostItem>>({
  title: '',
  category: 'other',
  date: '',
  excerpt: '',
  content: '',
})

const formRef = ref<FormInstance>()

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  date: [
    { required: true, message: '请输入日期', trigger: 'change' },
    {
      validator: (_rule, value: unknown, callback) => {
        const raw = String(value ?? '').trim()
        if (!raw) return callback(new Error('请输入日期'))
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (!match) return callback(new Error('日期格式应为 YYYY-MM-DD'))

        const year = Number(match[1])
        const month = Number(match[2])
        const day = Number(match[3])
        if (!year || month < 1 || month > 12) return callback(new Error('日期不合法'))
        const maxDay = new Date(year, month, 0).getDate()
        if (day < 1 || day > maxDay) return callback(new Error('日期不合法'))
        return callback()
      },
      trigger: 'change',
    },
  ],
  excerpt: [{ required: true, message: '请输入摘要', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }],
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const fileInputRef = ref<HTMLInputElement | null>(null)
const contentInputRef = ref<InputInstance>()
const isUploadingImage = ref(false)
const uploadError = ref('')

type TextSelection = { start: number; end: number }
const lastContentSelection = ref<TextSelection | null>(null)

const getContentTextarea = (): HTMLTextAreaElement | undefined => {
  const instance = contentInputRef.value as any
  const textareaOrRef = instance?.textarea ?? instance?.ref
  const resolved = unref(textareaOrRef)
  return resolved instanceof HTMLTextAreaElement ? resolved : undefined
}

const handleDocumentSelectionChange = () => {
  if (typeof document === 'undefined') return
  const textarea = getContentTextarea()
  if (!textarea) return
  if (document.activeElement !== textarea) return

  lastContentSelection.value = {
    start: textarea.selectionStart ?? 0,
    end: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
  }
}

let isTrackingContentSelection = false
const startContentSelectionTracking = () => {
  if (typeof document === 'undefined') return
  if (isTrackingContentSelection) return
  document.addEventListener('selectionchange', handleDocumentSelectionChange)
  isTrackingContentSelection = true
}

const stopContentSelectionTracking = () => {
  if (typeof document === 'undefined') return
  if (!isTrackingContentSelection) return
  document.removeEventListener('selectionchange', handleDocumentSelectionChange)
  isTrackingContentSelection = false
}

const CONTENT_TEXTAREA_EVENTS = ['keyup', 'mouseup', 'click', 'select'] as const
let boundContentTextarea: HTMLTextAreaElement | null = null
const bindContentTextareaSelectionEvents = () => {
  const textarea = getContentTextarea()
  if (!textarea) return
  if (boundContentTextarea === textarea) return

  if (boundContentTextarea) {
    for (const eventName of CONTENT_TEXTAREA_EVENTS) {
      boundContentTextarea.removeEventListener(eventName, captureContentSelection)
    }
  }

  boundContentTextarea = textarea
  for (const eventName of CONTENT_TEXTAREA_EVENTS) {
    textarea.addEventListener(eventName, captureContentSelection)
  }
}

const unbindContentTextareaSelectionEvents = () => {
  if (!boundContentTextarea) return
  for (const eventName of CONTENT_TEXTAREA_EVENTS) {
    boundContentTextarea.removeEventListener(eventName, captureContentSelection)
  }
  boundContentTextarea = null
}

const captureContentSelection = () => {
  const textarea = getContentTextarea()
  if (!textarea) return

  lastContentSelection.value = {
    start: textarea.selectionStart ?? 0,
    end: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
  }
}

const showExternalImage = ref(false)
const externalImageUrl = ref('')
const externalImageAlt = ref('')
const externalImageError = ref('')
const externalImageUrlRef = ref<InputInstance>()
type UploadResult = { url: string; key: string }

// Date parts
const dateYear = ref('')
const dateMonth = ref('')
const dateDay = ref('')

// Update formData.date whenever parts change
const updateDate = () => {
  if (dateYear.value && dateMonth.value && dateDay.value) {
    formData.date = `${dateYear.value}-${dateMonth.value.padStart(2, '0')}-${dateDay.value.padStart(2, '0')}`
  } else {
    formData.date = ''
  }
}

const normalizeDatePart = (raw: string, maxLen: number) =>
  raw.replace(/[^\d]/g, '').slice(0, maxLen)

watch(
  dateYear,
  (next) => {
    const normalized = normalizeDatePart(next, 4)
    if (normalized !== next) dateYear.value = normalized
    updateDate()
  },
  { immediate: true },
)

watch(
  dateMonth,
  (next) => {
    const normalized = normalizeDatePart(next, 2)
    if (normalized !== next) dateMonth.value = normalized
    updateDate()
  },
  { immediate: true },
)

watch(
  dateDay,
  (next) => {
    const normalized = normalizeDatePart(next, 2)
    if (normalized !== next) dateDay.value = normalized
    updateDate()
  },
  { immediate: true },
)

const buildAltFromFilename = (filename: string) => {
  const trimmed = filename.trim()
  if (!trimmed) return '图片'
  const base = trimmed.replace(/\.[^/.]+$/, '')
  return base || '图片'
}

const buildImageMarkdown = (url: string, altText?: string) => {
  const alt = (altText || '').trim() || '图片'
  return `![${alt}](${url})`
}

const insertMarkdownAtCursor = (markdown: string) => {
  const textarea = getContentTextarea()
  const current = formData.content ?? ''

  const cached = lastContentSelection.value
  const rawStart = cached?.start ?? textarea?.selectionStart ?? 0
  const rawEnd = cached?.end ?? textarea?.selectionEnd ?? rawStart

  const start = Math.min(Math.max(rawStart, 0), current.length)
  const end = Math.min(Math.max(rawEnd, start), current.length)

  const before = current.slice(0, start)
  const after = current.slice(end)

  const needsLeadingBreak = before.length > 0 && !before.endsWith('\n')
  const needsTrailingBreak = after.length > 0 && !after.startsWith('\n')
  const insertText = `${needsLeadingBreak ? '\n' : ''}${markdown}${needsTrailingBreak ? '\n' : ''}`

  formData.content = `${before}${insertText}${after}`

  nextTick(() => {
    const nextTextarea = getContentTextarea()
    const caret = start + insertText.length

    lastContentSelection.value = { start: caret, end: caret }

    if (!nextTextarea) return
    contentInputRef.value?.focus()
    nextTextarea.setSelectionRange(caret, caret)
  })
}

const openFilePicker = () => {
  uploadError.value = ''
  fileInputRef.value?.click()
}

const validateImageFile = (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return '图片格式不支持'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return '图片大小不能超过 5MB'
  }
  return ''
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) return
  if (target) target.value = ''

  const validationError = validateImageFile(file)
  if (validationError) {
    uploadError.value = validationError
    return
  }

  isUploadingImage.value = true
  uploadError.value = ''

  try {
    const { adminMediaControllerUploadImage } = getAdminMedia()
    const res = (await adminMediaControllerUploadImage({
      file,
      alt: buildAltFromFilename(file.name),
    })) as UploadResult

    const url = res?.url
    if (!url) {
      throw new Error('上传失败')
    }

    insertMarkdownAtCursor(buildImageMarkdown(url, buildAltFromFilename(file.name)))
  } catch (err: any) {
    uploadError.value = err?.response?.data?.message || '上传失败'
  } finally {
    isUploadingImage.value = false
  }
}

const openExternalImage = () => {
  externalImageUrl.value = ''
  externalImageAlt.value = ''
  externalImageError.value = ''
  showExternalImage.value = true
  nextTick(() => externalImageUrlRef.value?.focus())
}

const closeExternalImage = () => {
  externalImageError.value = ''
  showExternalImage.value = false
}

const handleInsertExternalImage = () => {
  const url = externalImageUrl.value.trim()
  const alt = externalImageAlt.value.trim()
  const isValid = /^https?:\/\/.+/i.test(url)

  if (!url || !isValid) {
    externalImageError.value = '请输入有效的图片链接（http/https）'
    return
  }

  externalImageError.value = ''
  insertMarkdownAtCursor(buildImageMarkdown(url, alt))
  showExternalImage.value = false
}

const ensureCategoriesLoaded = async () => {
  await categoriesStore.fetchActiveCategories()
  if (isAdminLike.value) {
    await categoriesStore.fetchAdminCategories()
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      showExternalImage.value = false
      uploadError.value = ''
      externalImageError.value = ''
      formRef.value?.clearValidate()
      stopContentSelectionTracking()
      unbindContentTextareaSelectionEvents()
      return
    }

    ensureCategoriesLoaded()
    nextTick(() => {
      formRef.value?.clearValidate()
      startContentSelectionTracking()
      bindContentTextareaSelectionEvents()
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopContentSelectionTracking()
  unbindContentTextareaSelectionEvents()
})

const getDefaultCategorySlug = () => {
  const other = categoriesStore.activeCategories.find((c) => c.slug === 'other')
  return other?.slug ?? categoriesStore.activeCategories[0]?.slug ?? 'other'
}

type CategoryOption = {
  slug: string
  name: string
  sortOrder: number
  isActive: boolean
}

const categoryOptions = computed<CategoryOption[]>(() => {
  const fromAdmin = isAdminLike.value && categoriesStore.adminCategories.length > 0

  const base: CategoryOption[] = fromAdmin
    ? categoriesStore.adminCategories.map((c) => ({
        slug: c.slug,
        name: c.name,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      }))
    : categoriesStore.activeCategories.map((c) => ({
        slug: c.slug,
        name: c.name,
        sortOrder: c.sortOrder,
        isActive: true,
      }))

  const selected = formData.category
  if (selected && !base.some((c) => c.slug === selected)) {
    base.push({
      slug: selected,
      name: categoriesStore.getLabel(selected),
      sortOrder: Number.MAX_SAFE_INTEGER,
      isActive: base.length === 0 ? true : false,
    })
  }

  if (!selected && base.length > 0) {
    formData.category = getDefaultCategorySlug()
  }

  return [...base].sort((a, b) => a.sortOrder - b.sortOrder)
})

watch(
  () => props.post,
  (newPost) => {
    if (newPost) {
      Object.assign(formData, {
        ...newPost,
        category: newPost.category || getDefaultCategorySlug(),
      })

      const match = (newPost.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (match) {
        dateYear.value = match[1] ?? ''
        dateMonth.value = match[2] ?? ''
        dateDay.value = match[3] ?? ''
      } else {
        dateYear.value = ''
        dateMonth.value = ''
        dateDay.value = ''
      }
    } else {
      // Defaults for new post
      const today = new Date()
      dateYear.value = today.getFullYear().toString()
      dateMonth.value = (today.getMonth() + 1).toString().padStart(2, '0')
      dateDay.value = today.getDate().toString().padStart(2, '0')
      
      Object.assign(formData, {
        title: '',
        category: getDefaultCategorySlug(),
        excerpt: '',
        content: '',
      })
    }
  },
  { immediate: true },
)

const handleSubmit = async () => {
  updateDate()

  const form = formRef.value
  if (form) {
    try {
      await form.validate()
    } catch {
      ElMessage.warning('请检查表单字段')
      return
    }
  }

  emit('save', { ...formData })
}
</script>

<template>
  <el-dialog
    class="terminal-post-editor"
    :model-value="isOpen"
    width="90%"
    align-center
    modal-class="terminal-post-editor__overlay"
    :show-close="false"
    :destroy-on-close="true"
    :close-on-click-modal="!isLoading"
    :close-on-press-escape="!isLoading"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-center justify-between p-4 border-b border-[#00ff00] bg-[#00ff00]/10">
        <h2 class="text-xl font-bold uppercase text-[#00ff00]">
          {{ post ? '> 编辑_扇区数据' : '> 写入_新数据' }}
        </h2>
        <button
          type="button"
          :disabled="isLoading"
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          X
        </button>
      </div>
    </template>

    <div class="p-6 overflow-y-auto custom-scrollbar terminal-post-editor__body">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="top"
        class="space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
          <el-form-item class="md:col-span-5" label="标题" prop="title">
            <el-input v-model="formData.title" :disabled="isLoading" />
          </el-form-item>

          <el-form-item class="md:col-span-3" label="分类" prop="category">
            <el-select v-model="formData.category" :disabled="isLoading" class="w-full">
              <el-option
                v-for="category in categoryOptions"
                :key="category.slug"
                :value="category.slug"
                :label="`${category.name}${category.isActive ? '' : ' (disabled)'} (${category.slug.toUpperCase()})`"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="md:col-span-4" label="日期 (YYYY-MM-DD)" prop="date">
            <div class="terminal-post-editor__date flex items-center gap-2 w-full">
              <el-input
                v-model="dateYear"
                inputmode="numeric"
                placeholder="YYYY"
                maxlength="4"
                style="width: 86px"
                class="terminal-post-editor__date-field"
                :disabled="isLoading"
              />
              <span class="text-[#00ff00] shrink-0">-</span>
              <el-input
                v-model="dateMonth"
                inputmode="numeric"
                placeholder="MM"
                maxlength="2"
                style="width: 64px"
                class="terminal-post-editor__date-field"
                :disabled="isLoading"
              />
              <span class="text-[#00ff00] shrink-0">-</span>
              <el-input
                v-model="dateDay"
                inputmode="numeric"
                placeholder="DD"
                maxlength="2"
                style="width: 64px"
                class="terminal-post-editor__date-field"
                :disabled="isLoading"
              />
            </div>
          </el-form-item>
        </div>

        <el-form-item label="摘要" prop="excerpt">
          <el-input v-model="formData.excerpt" type="textarea" :rows="3" :disabled="isLoading" />
        </el-form-item>

        <el-form-item prop="content">
          <template #label>
            <div class="flex flex-wrap items-center justify-between gap-3 w-full">
              <span>正文内容 (支持 Markdown)</span>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden"
                  @change="handleFileChange"
                />
                <el-button
                  size="small"
                  :disabled="isLoading || isUploadingImage"
                  @click="openFilePicker"
                >
                  {{ isUploadingImage ? '上传中...' : '上传图片' }}
                </el-button>
                <el-button
                  size="small"
                  :disabled="isLoading"
                  @click="openExternalImage"
                >
                  插入外链图片
                </el-button>
              </div>
            </div>
          </template>

          <div class="w-full space-y-2">
            <el-alert
              v-if="uploadError"
              type="error"
              show-icon
              :closable="false"
              :title="uploadError"
            />

            <el-input
              ref="contentInputRef"
              v-model="formData.content"
              type="textarea"
              :rows="15"
              :disabled="isLoading"
              class="terminal-post-editor__content"
              @keyup="captureContentSelection"
              @mouseup="captureContentSelection"
              @click="captureContentSelection"
            />
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="p-4 border-t border-[#00ff00] bg-[#00ff00]/5 flex justify-end gap-4">
        <el-button :disabled="isLoading" @click="emit('close')">取消</el-button>
        <el-button type="primary" :loading="isLoading" @click="handleSubmit">
          {{ isLoading ? '写入中...' : '保存_数据' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showExternalImage"
    class="terminal-post-editor__external"
    width="520px"
    :show-close="false"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
  >
    <template #header>
      <div class="flex items-center justify-between p-4 border-b border-[#00ff00] bg-[#00ff00]/10">
        <h3 class="text-sm font-bold uppercase text-[#00ff00]">插入外链图片</h3>
        <button
          type="button"
          @click="closeExternalImage"
          class="w-7 h-7 flex items-center justify-center border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors font-bold"
        >
          X
        </button>
      </div>
    </template>

    <div class="p-5 space-y-3">
      <div>
        <div class="text-xs uppercase opacity-80 mb-1">图片 URL</div>
        <el-input
          ref="externalImageUrlRef"
          v-model="externalImageUrl"
          placeholder="http://... 或 https://..."
        />
      </div>

      <div>
        <div class="text-xs uppercase opacity-80 mb-1">说明 (可选)</div>
        <el-input v-model="externalImageAlt" placeholder="图片说明" />
      </div>

      <el-alert
        v-if="externalImageError"
        type="error"
        show-icon
        :closable="false"
        :title="externalImageError"
      />
    </div>

    <template #footer>
      <div class="p-4 border-t border-[#00ff00] bg-[#00ff00]/5 flex justify-end gap-3">
        <el-button @click="closeExternalImage">取消</el-button>
        <el-button type="primary" @click="handleInsertExternalImage">插入</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.terminal-post-editor__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.terminal-post-editor__date {
  justify-content: flex-start;
}

.terminal-post-editor__date :deep(.el-input__inner) {
  text-align: center;
}

.terminal-post-editor__content :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
  font-size: 13px;
  line-height: 1.6;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 0, 0.45) #050a05;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #050a05;
  border-left: 1px solid rgba(0, 255, 0, 0.25);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 0, 0.35);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 0, 0.55);
}
</style>
