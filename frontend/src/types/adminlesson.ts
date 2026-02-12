export interface LessonData {
  lessonID: string;
  moduleCode: string;
  moduleName: string;
  lessonType: string;
  startDateTime: string;
  endDateTime: string;
  building: string;
  room: string;
  lecturerName?: string;
  tutorialGroupID?: string;
}

export interface CreateLessonRequest {
  moduleCode: string;
  lessonType: string;
  startDateTime: string;
  endDateTime: string;
  building: string;
  room: string;
}

export interface UpdateLessonRequest extends CreateLessonRequest {
  lessonID: string;
}