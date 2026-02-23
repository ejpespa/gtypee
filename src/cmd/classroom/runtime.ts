import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { ClassroomCommandDeps, ClassroomCourse } from "./commands.js";

export function buildClassroomCommandDeps(options: ServiceRuntimeOptions): Required<ClassroomCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    ensureWorkspace: async () => {
      await runtime.getClient(scopes("classroom"));
    },

    listCourses: async (): Promise<ClassroomCourse[]> => {
      const auth = await runtime.getClient(scopes("classroom"));
      const classroom = google.classroom({ version: "v1", auth });

      const response = await classroom.courses.list();
      const courses = response.data.courses ?? [];

      return courses.map((course) => ({
        id: course.id ?? "",
        name: course.name ?? "",
      }));
    },

    getCourse: async (courseId: string): Promise<ClassroomCourse> => {
      const auth = await runtime.getClient(scopes("classroom"));
      const classroom = google.classroom({ version: "v1", auth });

      const response = await classroom.courses.get({ id: courseId });

      return {
        id: response.data.id ?? "",
        name: response.data.name ?? "",
      };
    },

    createCourse: async (name: string): Promise<{ id: string; created: boolean }> => {
      const auth = await runtime.getClient(scopes("classroom"));
      const classroom = google.classroom({ version: "v1", auth });

      const response = await classroom.courses.create({
        requestBody: { name, ownerId: "me" },
      });

      return {
        id: response.data.id ?? "",
        created: response.status === 200,
      };
    },

    listSubmissions: async (courseId: string): Promise<Array<{ id: string; state: string }>> => {
      const auth = await runtime.getClient(scopes("classroom"));
      const classroom = google.classroom({ version: "v1", auth });

      const courseWorkResponse = await classroom.courses.courseWork.list({
        courseId,
      });
      const courseWorkItems = courseWorkResponse.data.courseWork ?? [];

      const submissions: Array<{ id: string; state: string }> = [];

      for (const work of courseWorkItems) {
        if (work.id == null) continue;

        const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
          courseId,
          courseWorkId: work.id,
        });
        const studentSubmissions = submissionsResponse.data.studentSubmissions ?? [];

        for (const submission of studentSubmissions) {
          submissions.push({
            id: submission.id ?? "",
            state: submission.state ?? "",
          });
        }
      }

      return submissions;
    },
  };
}
