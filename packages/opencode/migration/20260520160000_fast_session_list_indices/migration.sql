CREATE INDEX `session_project_time_updated_idx` ON `session` (`project_id`, `time_updated`);
CREATE INDEX `session_path_idx` ON `session` (`path`);
CREATE INDEX `session_title_idx` ON `session` (`title`);
