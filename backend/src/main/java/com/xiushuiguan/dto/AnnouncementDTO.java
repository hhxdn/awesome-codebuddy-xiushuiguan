package com.xiushuiguan.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AnnouncementDTO {
    private Long id;
    private String title;
    private String content;
    private Boolean published;
    private LocalDateTime publishTime;
    private LocalDateTime createTime;
}
