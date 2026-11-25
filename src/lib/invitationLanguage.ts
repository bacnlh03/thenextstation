import type { DesignConfig, DesignElement } from '@/types/design'

export type InvitationLanguage = 'vi' | 'en'

export function getElementContent(el: DesignElement, language: InvitationLanguage) {
  return language === 'vi' ? (el.contentVi ?? el.content) : el.content
}

export function getMealInviteContent(
  invite: NonNullable<DesignConfig['mealInvite']>,
  language: InvitationLanguage,
) {
  if (language === 'vi') {
    return {
      title: invite.titleVi ?? invite.title,
      content: invite.contentVi ?? invite.content,
      address: invite.addressVi ?? invite.address,
      note: invite.noteVi ?? invite.note,
    }
  }
  return {
    title: invite.title,
    content: invite.content,
    address: invite.address,
    note: invite.note,
  }
}
