import { create } from 'zustand'
import type { Project, ProjectFilter } from '@shared/types/electron'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  filter: ProjectFilter
  isLoading: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  setFilter: (filter: ProjectFilter) => void
  selectProject: (project: Project | null) => void
  createProject: (title: string, description: string, audioFilePath: string) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  refreshProjects: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  filter: {},
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filter } = get()
      const projects = await window.electronAPI.project.findAll(filter)
      set({ projects, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        isLoading: false,
      })
    }
  },

  setFilter: (filter: ProjectFilter) => {
    set({ filter })
    get().fetchProjects()
  },

  selectProject: (project: Project | null) => {
    set({ selectedProject: project })
  },

  createProject: async (title: string, description: string, audioFilePath: string) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.electronAPI.project.create({
        title,
        description,
        audio_file_path: audioFilePath,
      })
      set({ isLoading: false })
      await get().fetchProjects()
      return project
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false,
      })
      throw error
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.project.delete(id)
      await get().fetchProjects()
      set({ isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false,
      })
      throw error
    }
  },

  refreshProjects: async () => {
    await get().fetchProjects()
  },
}))
