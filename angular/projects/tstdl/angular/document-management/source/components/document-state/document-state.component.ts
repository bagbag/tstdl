import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked, ViewEncapsulation } from '@angular/core';
import { DateTimeLocalePipe, LocalizeEnumPipe } from '@tstdl/angular';
import { enterAnimation } from '@tstdl/angular/animations';
import { BadgeComponent } from '@tstdl/angular/badge';
import { ButtonComponent } from '@tstdl/angular/button';
import { IconComponent, type IconName } from '@tstdl/angular/icon';
import { DocumentWorkflowFailReason, DocumentWorkflowState, DocumentWorkflowStep, type EnrichedDocument } from '@tstdl/base/document-management';
import { dateTimeNumeric } from '@tstdl/base/formats';

import { enumValues } from '@tstdl/base/utils';
import { fromEntries } from '@tstdl/base/utils/object';
import type { DocumentManagementContext } from '../../context';

const workflowStateColors = {
  [DocumentWorkflowState.Pending]: 'yellow',
  [DocumentWorkflowState.Running]: 'blue',
  [DocumentWorkflowState.Review]: 'amber',
  [DocumentWorkflowState.Completed]: 'emerald',
  [DocumentWorkflowState.Error]: 'red',
  [DocumentWorkflowState.Failed]: 'red',
  'none': 'neutral',
} as const satisfies Record<DocumentWorkflowState | 'none', string>;

const workflowStateClasses = {
  [DocumentWorkflowState.Pending]: 'text-yellow-500',
  [DocumentWorkflowState.Running]: 'text-blue-500',
  [DocumentWorkflowState.Review]: 'text-amber-500',
  [DocumentWorkflowState.Completed]: 'text-emerald-500',
  [DocumentWorkflowState.Error]: 'text-red-500',
  [DocumentWorkflowState.Failed]: 'text-red-500',
  'none': 'neutral',
} as const satisfies Record<DocumentWorkflowState | 'none', string>;

const workflowStepIcons: Record<DocumentWorkflowStep, IconName> = {
  [DocumentWorkflowStep.Classification]: 'tags',
  [DocumentWorkflowStep.Extraction]: 'file-earmark-break',
  [DocumentWorkflowStep.Assignment]: 'folder2-open',
  [DocumentWorkflowStep.Validation]: 'clipboard-check',
} as const satisfies Record<DocumentWorkflowStep, IconName>;

const workflowSteps = enumValues(DocumentWorkflowStep);

@Component({
  selector: 'tsl-document-state',
  imports: [NgClass, LocalizeEnumPipe, DateTimeLocalePipe, BadgeComponent, IconComponent, ButtonComponent],
  templateUrl: './document-state.component.html',
  styleUrl: './document-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [enterAnimation()]
})
export class DocumentStateComponent {
  readonly context = input.required<DocumentManagementContext>();
  readonly document = input.required<EnrichedDocument>();

  readonly stateColors = workflowStateColors;
  readonly stateClasses = workflowStateClasses;
  readonly stepIcons = workflowStepIcons;
  readonly workflowSteps = workflowSteps;
  readonly DocumentWorkflowStep = DocumentWorkflowStep;
  readonly DocumentWorkflowState = DocumentWorkflowState;
  readonly DocumentWorkflowFailReason = DocumentWorkflowFailReason;
  readonly dateTimeNumeric = dateTimeNumeric;

  readonly selectedWorkflowStep = signal<DocumentWorkflowStep | null>(null);
  readonly selectedWorkflow = computed(() => this.document().workflows.find((workflow) => workflow.step == this.selectedWorkflowStep()) ?? null);

  readonly lastStepStates = computed(() => {
    const entries = workflowSteps.map((step) => {
      const workflow = this.document().workflows.find((workflow) => workflow.step == step);
      return [step, workflow?.state ?? 'none'] as const;
    });

    return fromEntries(entries);
  });

  constructor() {
    const latestWorkflowId = computed(() => this.document().workflows[0]?.id ?? null);

    effect(() => {
      latestWorkflowId();

      const latestWorkflow = untracked(this.document).workflows[0];
      this.selectedWorkflowStep.set(latestWorkflow?.step ?? DocumentWorkflowStep.Classification);
    });
  }
}
