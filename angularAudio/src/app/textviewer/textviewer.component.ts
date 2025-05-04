import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TextService } from '../services/text.service';
import { Subject, takeUntil } from 'rxjs';
@Component({
  selector: 'app-textviewer',
  imports: [],
  templateUrl: './textviewer.component.html',
  styleUrl: './textviewer.component.scss'
})
export class TextviewerComponent implements OnInit, OnDestroy {
  textContent: string = '';

  private service = inject(TextService);
  private activatedRoute = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();
  constructor(
  ) { };

  ngOnInit(): void {
    this.activatedRoute.paramMap
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(
        async (params: any) => {
          let file = await params.get('file');
          this.service.getText(encodeURIComponent(file))
            .pipe(
              takeUntil(this.destroy$)
            )
            .subscribe(
              (text) => this.textContent = text
            );
        }
      )
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
