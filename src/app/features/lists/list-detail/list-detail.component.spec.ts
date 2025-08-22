import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListDetailComponent } from './list-detail.component';

describe('ListDetailComponent', () => {
  let component: ListDetailComponent;
  let fixture: ComponentFixture<ListDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
